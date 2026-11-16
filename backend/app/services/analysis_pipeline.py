from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.models import (
    FoodDetection,
    FoodItem,
    ImageQualityCheck,
    Meal,
    MealImage,
    ModelVersion,
    NutritionNorm,
    NutritionRecord,
    TrayConfig,
    VerificationRecord,
)
from app.ai.tray_vision import extract_compartment_crops, load_tray_config, run_image_quality_gate
from app.ai.food_classifier import food_recognition_module
from app.ai.portion_estimator import estimate_portion_grams_with_range
from app.nutrition import (
    calculate_item_nutrition_range,
    compute_overall_confidence,
    evaluate_norm_and_status,
    resolve_food_nutrition_per_100g,
    should_create_verification_task,
)


def get_active_tray_config_dict(db: Session) -> Dict[str, Any]:
    row = db.query(TrayConfig).filter(TrayConfig.is_active == True).order_by(TrayConfig.id.desc()).first()
    if row is not None:
        return {
            "tray_name": row.tray_name,
            "version": row.version,
            "tray_width_cm": row.tray_width_cm,
            "tray_height_cm": row.tray_height_cm,
            "marker": row.marker_config,
            "compartments": row.compartments_config,
            "default_meal_mapping": row.default_meal_mapping,
        }
    return load_tray_config()


def run_full_meal_analysis(
    db: Session,
    meal: Meal,
    image_path: Path,
    original_filename: str = "meal_capture.jpg",
) -> Dict[str, Any]:
    """
    Executes the full end-to-end ThaliCheck analysis pipeline:
    1. Image quality check (blur, brightness, marker visibility, framing, tilt)
    2. Marker detection & pixel-to-cm scale
    3. Compartment localization
    4. Per-compartment food recognition (PyTorch or clearly flagged Demo/Smoke state)
    5. Geometric + scale-calibrated portion estimation with residual range [low, likely, high]
    6. Nutrition mapping (IFCT / school recipe, flagging unverified/missing values)
    7. Norm comparison with range-straddle logic
    8. Overall confidence calculation ("weakest factor caps tier")
    9. Auto-creation of verification task if low-confidence or shortfall
    10. Persistence to PostgreSQL
    """
    tray_cfg = get_active_tray_config_dict(db)

    # Clear prior detections/nutrition if re-analyzing
    db.query(FoodDetection).filter(FoodDetection.meal_id == meal.id).delete()
    db.query(NutritionRecord).filter(NutritionRecord.meal_id == meal.id).delete()
    db.query(MealImage).filter(MealImage.meal_id == meal.id).delete()
    db.query(ImageQualityCheck).filter(ImageQualityCheck.meal_id == meal.id).delete()
    db.flush()

    # Step 1: Image quality gate
    q_result = run_image_quality_gate(image_path, tray_cfg)

    qc_row = ImageQualityCheck(
        meal_id=meal.id,
        image_path=str(image_path),
        passed=bool(q_result["passed"]),
        quality_score=float(q_result["quality_score"]),
        blur_variance=float(q_result["blur_variance"]),
        brightness_mean=float(q_result["brightness_mean"]),
        marker_visible=bool(q_result["marker_visible"]),
        tray_coverage_ratio=float(q_result["tray_coverage_ratio"]),
        tilt_degrees=float(q_result["tilt_degrees"]),
        issues=q_result["issues"],
        retake_guidance=q_result["retake_guidance"],
    )
    db.add(qc_row)

    img_row = MealImage(
        meal_id=meal.id,
        file_path=str(image_path),
        original_filename=original_filename,
        width_px=int(q_result["width_px"]),
        height_px=int(q_result["height_px"]),
        marker_detected=bool(q_result["marker_visible"]),
        px_per_cm=q_result["px_per_cm"],
        marker_bbox=q_result["marker_bbox"],
        rotation_deg=float(q_result["tilt_degrees"]),
    )
    db.add(img_row)

    active_model_row = (
        db.query(ModelVersion)
        .filter(ModelVersion.is_active == True)
        .order_by(ModelVersion.trained_at.desc())
        .first()
    )
    model_info = food_recognition_module.get_active_model_info(active_model_row)
    meal.model_state = model_info["model_state"]
    meal.model_version_tag = model_info["version_tag"]
    if model_info["model_state"] == "DEMO_MODE":
        meal.is_demo = True

    # Quality rejection gate: if marker is missing, blurry, dark, or tilted, do NOT output a confident portion
    if not q_result["passed"]:
        meal.status = "QUALITY_REJECTED"
        meal.status_explanation = (
            f"Image quality insufficient for reliable portion estimation. {q_result['retake_guidance']}"
        )
        meal.overall_confidence_tier = "LOW"
        meal.overall_confidence_pct = round(float(q_result["quality_score"]) * 45.0, 1)
        meal.confidence_breakdown = {
            "quality_gate_passed": False,
            "issues": q_result["issues"],
            "retake_guidance": q_result["retake_guidance"],
        }
        meal.requires_verification = True
        meal.verification_status = "PENDING"
        meal.verification_reason = f"Image quality gate rejected ({', '.join(q_result['issues'])})"
        meal.analyzed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(meal)
        return {
            "meal_id": meal.id,
            "quality_check": q_result,
            "status": meal.status,
            "status_explanation": meal.status_explanation,
            "model_info": model_info,
        }

    # Step 2 & 3: Extract compartment crops & geometry
    crops, comp_metrics = extract_compartment_crops(image_path, tray_cfg)
    meal_mapping = tray_cfg.get("default_meal_mapping", {}).get(meal.meal_type, {})

    all_foods = db.query(FoodItem).all()
    food_by_code = {f.code.lower(): f for f in all_foods}
    food_by_name = {f.name.lower(): f for f in all_foods}

    cal_low_total = 0.0
    cal_likely_total = 0.0
    cal_high_total = 0.0
    prot_low_total = 0.0
    prot_likely_total = 0.0
    prot_high_total = 0.0

    cls_confidences: List[float] = []
    has_low_conf_detection = False
    all_portions_calibrated = True
    all_nutrition_verified = True
    has_missing_nutrition = False
    excluded_items: List[str] = []

    for comp in tray_cfg.get("compartments", []):
        cid = comp["id"]
        crop_img = crops[cid]
        c_metric = comp_metrics[cid]
        expected_name = meal_mapping.get(cid, "Rice")

        cls_res = food_recognition_module.classify_compartment(
            crop_img=crop_img,
            compartment_id=cid,
            comp_metric=c_metric,
            default_expected_food=expected_name,
            model_info=model_info,
        )

        f_code = cls_res["food_code"].lower()
        f_name = cls_res["food_name"]
        food_item = food_by_code.get(f_code) or food_by_name.get(f_name.lower())

        # Estimate portion with scale calibration & residuals
        portion_res = estimate_portion_grams_with_range(
            db=db,
            food_item=food_item,
            fill_fraction=float(c_metric["fill_fraction"]),
            compartment_volume_ml=float(c_metric["configured_volume_ml"]),
        )

        if not portion_res["is_calibrated"]:
            all_portions_calibrated = False

        # Resolve nutrition per 100g
        nutr_info = resolve_food_nutrition_per_100g(db, food_item, school_id=meal.school_id)
        item_nutr = calculate_item_nutrition_range(
            grams_low=portion_res["low_grams"],
            grams_likely=portion_res["likely_grams"],
            grams_high=portion_res["high_grams"],
            calories_per_100g=nutr_info["calories_per_100g"],
            protein_per_100g=nutr_info["protein_per_100g"],
        )

        if nutr_info["missing"]:
            has_missing_nutrition = True
            all_nutrition_verified = False
            excluded_items.append(f"{f_name} ({cid})")
        else:
            if not nutr_info["verified"]:
                all_nutrition_verified = False
            cal_low_total += float(item_nutr["calories_low"] or 0.0)
            cal_likely_total += float(item_nutr["calories_likely"] or 0.0)
            cal_high_total += float(item_nutr["calories_high"] or 0.0)
            prot_low_total += float(item_nutr["protein_low"] or 0.0)
            prot_likely_total += float(item_nutr["protein_likely"] or 0.0)
            prot_high_total += float(item_nutr["protein_high"] or 0.0)

        cls_confidences.append(float(cls_res["calibrated_confidence"]))
        if cls_res["is_low_confidence"]:
            has_low_conf_detection = True

        det_row = FoodDetection(
            meal_id=meal.id,
            compartment_id=cid,
            compartment_name=comp["name"],
            food_item_id=food_item.id if food_item else None,
            detected_food_name=f_name,
            raw_confidence=float(cls_res["raw_confidence"]),
            calibrated_confidence=float(cls_res["calibrated_confidence"]),
            is_low_confidence=bool(cls_res["is_low_confidence"]),
            fill_fraction=float(c_metric["fill_fraction"]),
            geometric_grams=float(portion_res["geometric_grams"]),
            estimated_grams_low=float(portion_res["low_grams"]),
            estimated_grams_likely=float(portion_res["likely_grams"]),
            estimated_grams_high=float(portion_res["high_grams"]),
            is_portion_calibrated=bool(portion_res["is_calibrated"]),
            calibration_sample_count=int(portion_res["sample_count"]),
            calories_low=item_nutr["calories_low"],
            calories_likely=item_nutr["calories_likely"],
            calories_high=item_nutr["calories_high"],
            protein_low=item_nutr["protein_low"],
            protein_likely=item_nutr["protein_likely"],
            protein_high=item_nutr["protein_high"],
            nutrition_verified=bool(nutr_info["verified"]),
            nutrition_missing=bool(nutr_info["missing"]),
            nutrition_source=str(nutr_info["source"]),
            manually_corrected=False,
        )
        db.add(det_row)

    # Resolve configurable norm for scheme + age_group + meal_type
    norm = (
        db.query(NutritionNorm)
        .filter(
            NutritionNorm.scheme == meal.scheme,
            NutritionNorm.age_group == meal.age_group,
            NutritionNorm.meal_type == meal.meal_type,
            NutritionNorm.is_active == True,
        )
        .first()
    )
    if norm is None:
        norm = (
            db.query(NutritionNorm)
            .filter(NutritionNorm.meal_type == meal.meal_type, NutritionNorm.is_active == True)
            .first()
        )

    target_cal = float(norm.calorie_target) if norm else 450.0
    target_prot = float(norm.protein_target) if norm else 12.0
    tol_pct = float(norm.tolerance_pct) if norm else 10.0
    sev_pct = float(norm.severe_shortfall_pct) if norm else 22.0

    norm_eval = evaluate_norm_and_status(
        calories_range=(round(cal_low_total, 1), round(cal_likely_total, 1), round(cal_high_total, 1)),
        protein_range=(round(prot_low_total, 2), round(prot_likely_total, 2), round(prot_high_total, 2)),
        target_calories=target_cal,
        target_protein=target_prot,
        tolerance_pct=tol_pct,
        severe_shortfall_pct=sev_pct,
    )

    conf_eval = compute_overall_confidence(
        classification_confidences=cls_confidences,
        quality_score=float(q_result["quality_score"]),
        marker_detected=bool(q_result["marker_visible"]),
        all_portions_calibrated=all_portions_calibrated,
        all_nutrition_verified=all_nutrition_verified,
        has_missing_nutrition=has_missing_nutrition,
        low_confidence_threshold=float(model_info.get("low_confidence_threshold", settings.LOW_CONFIDENCE_THRESHOLD)),
    )

    needs_verif, verif_reason = should_create_verification_task(
        status=str(norm_eval["status"]),
        overall_confidence_tier=str(conf_eval["tier"]),
        has_low_confidence_detection=has_low_conf_detection,
        has_missing_nutrition=has_missing_nutrition,
    )

    explanation_text = str(norm_eval["explanation"])
    if has_low_conf_detection:
        explanation_text += " Low-confidence detection. Human verification recommended."
    if has_missing_nutrition:
        explanation_text += f" Note: {', '.join(excluded_items)} excluded from totals due to missing nutrition values."

    nutr_record = NutritionRecord(
        meal_id=meal.id,
        norm_id=norm.id if norm else None,
        total_calories_low=round(cal_low_total, 1),
        total_calories_likely=round(cal_likely_total, 1),
        total_calories_high=round(cal_high_total, 1),
        total_protein_low=round(prot_low_total, 2),
        total_protein_likely=round(prot_likely_total, 2),
        total_protein_high=round(prot_high_total, 2),
        target_calories=target_cal,
        target_protein=target_prot,
        tolerance_pct=tol_pct,
        calorie_gap_likely=float(norm_eval["calorie_gap_likely"]),
        protein_gap_likely=float(norm_eval["protein_gap_likely"]),
        range_straddles_threshold=bool(norm_eval["range_straddles_threshold"]),
        has_unverified_nutrition=not all_nutrition_verified,
        has_missing_nutrition=has_missing_nutrition,
        has_uncalibrated_portions=not all_portions_calibrated,
        excluded_items=excluded_items,
        ai_explanation=explanation_text,
    )
    db.add(nutr_record)

    meal.status = str(norm_eval["status"])
    meal.status_explanation = explanation_text
    meal.overall_confidence_tier = str(conf_eval["tier"])
    meal.overall_confidence_pct = float(conf_eval["percentage"])
    meal.confidence_breakdown = conf_eval["breakdown"]
    meal.requires_verification = needs_verif
    meal.verification_status = "PENDING" if needs_verif else "NOT_REQUIRED"
    meal.verification_reason = verif_reason
    meal.analyzed_at = datetime.now(timezone.utc)

    if needs_verif:
        auto_verif = VerificationRecord(
            meal_id=meal.id,
            officer_id=None,
            action="AUTO_FLAGGED",
            previous_value=None,
            new_value={"status": meal.status, "confidence_tier": meal.overall_confidence_tier},
            reason=verif_reason or "Flagged by AI monitoring safeguard",
            notes="Automatically queued for human verification.",
        )
        db.add(auto_verif)

    db.commit()
    db.refresh(meal)

    return {
        "meal_id": meal.id,
        "status": meal.status,
        "status_explanation": meal.status_explanation,
        "overall_confidence_tier": meal.overall_confidence_tier,
        "overall_confidence_pct": meal.overall_confidence_pct,
        "requires_verification": meal.requires_verification,
        "verification_reason": meal.verification_reason,
        "quality_check": q_result,
        "model_info": model_info,
    }
