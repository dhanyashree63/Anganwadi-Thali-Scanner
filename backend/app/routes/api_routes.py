import csv
from datetime import datetime, timezone
import json
from pathlib import Path
import shutil
import uuid
from typing import Any, Dict, List, Optional
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session
from app.config import settings, PROJECT_ROOT
from app.database import SessionLocal, get_db
from app.models import (
    AuditLog,
    CalibrationModel,
    DatasetSample,
    FoodDetection,
    FoodItem,
    ImageQualityCheck,
    Meal,
    MealImage,
    ModelEvaluation,
    ModelVersion,
    NutritionNorm,
    NutritionRecord,
    Recipe,
    RecipeIngredient,
    School,
    TrayConfig,
    User,
    VerificationRecord,
)
from app.schemas import (
    FoodItemCreate,
    FoodItemUpdate,
    LoginRequest,
    MealCreate,
    NutritionNormCreate,
    RecipeCreate,
    RegisterRequest,
    SchoolCreate,
    TokenResponse,
    TrayConfigUpdate,
    UserOut,
    VerificationActionRequest,
)
from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    record_audit_log,
    require_roles,
    verify_password,
)
from app.ai.tray_vision import extract_compartment_crops, run_image_quality_gate
from app.ai.food_classifier import food_recognition_module
from app.ai.portion_estimator import estimate_portion_grams_with_range, fit_portion_calibration_for_food
from app.ai.anomaly_detector import detect_meal_anomalies, detect_school_shortfall_patterns
from app.nutrition import (
    calculate_item_nutrition_range,
    compute_overall_confidence,
    compute_recipe_nutrition_per_100g,
    evaluate_norm_and_status,
    resolve_food_nutrition_per_100g,
)
from app.services.analysis_pipeline import get_active_tray_config_dict, run_full_meal_analysis

router = APIRouter()

# In-memory background task tracker for training/evaluation progress
BACKGROUND_JOB_STATE: Dict[str, Dict[str, Any]] = {
    "training": {"status": "IDLE", "message": "No training job running.", "updated_at": None, "result": None},
    "evaluation": {"status": "IDLE", "message": "No evaluation job running.", "updated_at": None, "result": None},
}

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def _validate_and_save_upload(upload: UploadFile, target_dir: Path) -> Path:
    if not upload or not upload.filename:
        raise HTTPException(status_code=400, detail="Missing image file. Please select a valid meal photo.")
    ext = Path(upload.filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: JPG, JPEG, PNG, WEBP.",
        )
    target_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
    dest = target_dir / safe_name
    try:
        with open(dest, "wb") as f:
            shutil.copyfileobj(upload.file, f)
        # Verify Pillow can open the image
        from PIL import Image
        with Image.open(dest) as img:
            img.verify()
    except Exception as exc:
        if dest.exists():
            dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Invalid or corrupted image file: {exc}")
    return dest


def _serialize_meal(meal: Meal) -> Dict[str, Any]:
    nr = meal.nutrition_record
    qc = meal.quality_checks[-1] if meal.quality_checks else None
    img = meal.images[-1] if meal.images else None

    detections_out = []
    for d in meal.detections:
        detections_out.append({
            "id": d.id,
            "compartment_id": d.compartment_id,
            "compartment_name": d.compartment_name,
            "food_item_id": d.food_item_id,
            "detected_food_name": d.detected_food_name,
            "raw_confidence": d.raw_confidence,
            "calibrated_confidence": d.calibrated_confidence,
            "is_low_confidence": d.is_low_confidence,
            "fill_fraction": d.fill_fraction,
            "geometric_grams": d.geometric_grams,
            "estimated_grams_low": d.estimated_grams_low,
            "estimated_grams_likely": d.estimated_grams_likely,
            "estimated_grams_high": d.estimated_grams_high,
            "portion_label": f"Estimated portion: {d.estimated_grams_low:.0f}–{d.estimated_grams_high:.0f} g (likely {d.estimated_grams_likely:.0f} g)",
            "is_portion_calibrated": d.is_portion_calibrated,
            "calibration_sample_count": d.calibration_sample_count,
            "calories_low": d.calories_low,
            "calories_likely": d.calories_likely,
            "calories_high": d.calories_high,
            "protein_low": d.protein_low,
            "protein_likely": d.protein_likely,
            "protein_high": d.protein_high,
            "nutrition_verified": d.nutrition_verified,
            "nutrition_missing": d.nutrition_missing,
            "nutrition_source": d.nutrition_source,
            "manually_corrected": d.manually_corrected,
        })

    return {
        "id": meal.id,
        "school_id": meal.school_id,
        "school_name": meal.school.name if meal.school else f"School #{meal.school_id}",
        "school_code": meal.school.code if meal.school else "",
        "district": meal.school.district if meal.school else "",
        "meal_date": meal.meal_date,
        "meal_type": meal.meal_type,
        "scheme": meal.scheme,
        "age_group": meal.age_group,
        "children_served": meal.children_served,
        "notes": meal.notes,
        "status": meal.status,
        "status_explanation": meal.status_explanation,
        "overall_confidence_tier": meal.overall_confidence_tier,
        "overall_confidence_pct": meal.overall_confidence_pct,
        "confidence_breakdown": meal.confidence_breakdown,
        "requires_verification": meal.requires_verification,
        "verification_status": meal.verification_status,
        "verification_reason": meal.verification_reason,
        "is_demo": meal.is_demo,
        "model_state": meal.model_state,
        "model_version_tag": meal.model_version_tag,
        "created_at": meal.created_at.isoformat() if meal.created_at else None,
        "analyzed_at": meal.analyzed_at.isoformat() if meal.analyzed_at else None,
        "image": {
            "id": img.id,
            "file_path": img.file_path,
            "image_url": f"/static-files/{Path(img.file_path).relative_to(PROJECT_ROOT / 'data').as_posix()}"
            if img.file_path and str(PROJECT_ROOT / "data") in str(Path(img.file_path).resolve())
            else None,
            "original_filename": img.original_filename,
            "marker_detected": img.marker_detected,
            "px_per_cm": img.px_per_cm,
            "rotation_deg": img.rotation_deg,
        } if img else None,
        "quality_check": {
            "passed": qc.passed,
            "quality_score": qc.quality_score,
            "blur_variance": qc.blur_variance,
            "brightness_mean": qc.brightness_mean,
            "marker_visible": qc.marker_visible,
            "tray_coverage_ratio": qc.tray_coverage_ratio,
            "tilt_degrees": qc.tilt_degrees,
            "issues": qc.issues,
            "retake_guidance": qc.retake_guidance,
        } if qc else None,
        "nutrition": {
            "total_calories_low": nr.total_calories_low,
            "total_calories_likely": nr.total_calories_likely,
            "total_calories_high": nr.total_calories_high,
            "total_protein_low": nr.total_protein_low,
            "total_protein_likely": nr.total_protein_likely,
            "total_protein_high": nr.total_protein_high,
            "target_calories": nr.target_calories,
            "target_protein": nr.target_protein,
            "tolerance_pct": nr.tolerance_pct,
            "calorie_gap_likely": nr.calorie_gap_likely,
            "protein_gap_likely": nr.protein_gap_likely,
            "range_straddles_threshold": nr.range_straddles_threshold,
            "has_unverified_nutrition": nr.has_unverified_nutrition,
            "has_missing_nutrition": nr.has_missing_nutrition,
            "has_uncalibrated_portions": nr.has_uncalibrated_portions,
            "excluded_items": nr.excluded_items,
            "ai_explanation": nr.ai_explanation,
        } if nr else None,
        "detections": detections_out,
        "verifications": [
            {
                "id": v.id,
                "action": v.action,
                "reason": v.reason,
                "notes": v.notes,
                "previous_value": v.previous_value,
                "new_value": v.new_value,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in meal.verification_records
        ],
    }


# ---------------------------------------------------------------------------
# 1. AUTHENTICATION & USERS
# ---------------------------------------------------------------------------
@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email.ilike(payload.email.strip())).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials.",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is inactive.")

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    record_audit_log(db, user, "Auth", str(user.id), "USER_LOGIN", reason="User logged into ThaliCheck")
    db.commit()
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
):
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
    role = payload.role.upper().strip()
    if role not in ("ADMIN", "OFFICER", "STAFF"):
        raise HTTPException(status_code=400, detail="Role must be ADMIN, OFFICER, or STAFF.")
    existing = db.query(User).filter(User.email.ilike(payload.email.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with that email already exists.")

    new_user = User(
        email=payload.email.strip().lower(),
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=role,
        school_id=payload.school_id,
        is_active=True,
    )
    db.add(new_user)
    db.flush()
    record_audit_log(
        db,
        current_user,
        "User",
        str(new_user.id),
        "CREATE_USER",
        new_value={"email": new_user.email, "role": new_user.role},
        reason="Admin created user account",
    )
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
):
    return db.query(User).order_by(User.id.asc()).all()


# ---------------------------------------------------------------------------
# 2. SCHOOLS & SCHOOL STATISTICS
# ---------------------------------------------------------------------------
@router.get("/schools")
def list_schools(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schools = db.query(School).filter(School.is_active == True).order_by(School.id.asc()).all()
    return [
        {
            "id": s.id,
            "code": s.code,
            "name": s.name,
            "center_type": s.center_type,
            "district": s.district,
            "block": s.block,
            "scheme": s.scheme,
            "default_age_group": s.default_age_group,
            "enrolled_children": s.enrolled_children,
            "is_active": s.is_active,
        }
        for s in schools
    ]


@router.post("/schools", status_code=status.HTTP_201_CREATED)
def create_school(
    payload: SchoolCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
):
    existing = db.query(School).filter(School.code.ilike(payload.code.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail="School code already exists.")
    s = School(
        code=payload.code.strip().upper(),
        name=payload.name.strip(),
        center_type=payload.center_type,
        district=payload.district.strip(),
        block=payload.block.strip(),
        scheme=payload.scheme.strip(),
        default_age_group=payload.default_age_group.strip(),
        enrolled_children=payload.enrolled_children,
    )
    db.add(s)
    db.flush()
    record_audit_log(
        db,
        current_user,
        "School",
        str(s.id),
        "CREATE_SCHOOL",
        new_value={"code": s.code, "name": s.name},
        reason="Admin created school/centre",
    )
    db.commit()
    db.refresh(s)
    return s


@router.get("/schools/{school_id}/statistics")
def get_school_statistics(
    school_id: int,
    include_demo: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found.")

    q = (
        db.query(Meal)
        .filter(
            Meal.school_id == school.id,
            Meal.status.in_(["ADEQUATE", "POTENTIAL_SHORTFALL", "SIGNIFICANT_SHORTFALL"]),
        )
        .order_by(Meal.meal_date.asc(), Meal.id.asc())
    )
    if not include_demo:
        q = q.filter(Meal.is_demo == False)

    meals = q.all()
    total = len(meals)
    adequate = sum(1 for m in meals if m.status == "ADEQUATE")
    potential = sum(1 for m in meals if m.status == "POTENTIAL_SHORTFALL")
    significant = sum(1 for m in meals if m.status == "SIGNIFICANT_SHORTFALL")
    verif_count = sum(1 for m in meals if m.requires_verification or m.verification_status != "NOT_REQUIRED")

    cals = [m.nutrition_record.total_calories_likely for m in meals if m.nutrition_record]
    prots = [m.nutrition_record.total_protein_likely for m in meals if m.nutrition_record]
    avg_cal = round(sum(cals) / len(cals), 1) if cals else 0.0
    avg_prot = round(sum(prots) / len(prots), 2) if prots else 0.0

    trends = []
    for m in meals:
        nr = m.nutrition_record
        if nr:
            trends.append({
                "meal_id": m.id,
                "date": m.meal_date,
                "meal_type": m.meal_type,
                "calories_low": nr.total_calories_low,
                "calories_likely": nr.total_calories_likely,
                "calories_high": nr.total_calories_high,
                "target_calories": nr.target_calories,
                "protein_low": nr.total_protein_low,
                "protein_likely": nr.total_protein_likely,
                "protein_high": nr.total_protein_high,
                "target_protein": nr.target_protein,
                "status": m.status,
                "confidence_tier": m.overall_confidence_tier,
                "verification_status": m.verification_status,
            })

    patterns = [p for p in detect_school_shortfall_patterns(db, include_demo=include_demo) if p["school_id"] == school.id]
    pattern_info = patterns[0] if patterns else None

    return {
        "school": {
            "id": school.id,
            "code": school.code,
            "name": school.name,
            "center_type": school.center_type,
            "district": school.district,
            "block": school.block,
            "scheme": school.scheme,
            "default_age_group": school.default_age_group,
            "enrolled_children": school.enrolled_children,
        },
        "total_meals": total,
        "average_calories": avg_cal,
        "average_protein": avg_prot,
        "adequate_count": adequate,
        "potential_shortfall_count": potential,
        "significant_shortfall_count": significant,
        "adequate_pct": round((adequate / total) * 100.0, 1) if total else 0.0,
        "potential_shortfall_pct": round((potential / total) * 100.0, 1) if total else 0.0,
        "significant_shortfall_pct": round((significant / total) * 100.0, 1) if total else 0.0,
        "verification_count": verif_count,
        "shortfall_pattern": pattern_info,
        "trends": trends,
    }


# ---------------------------------------------------------------------------
# 3. MEALS, IMAGE QUALITY CHECK & AI ANALYSIS
# ---------------------------------------------------------------------------
@router.post("/images/quality-check")
def check_uploaded_image_quality(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saved_path = _validate_and_save_upload(image, settings.UPLOAD_DIR)
    tray_cfg = get_active_tray_config_dict(db)
    q_result = run_image_quality_gate(saved_path, tray_cfg)

    qc_row = ImageQualityCheck(
        meal_id=None,
        image_path=str(saved_path),
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
    db.commit()
    return q_result


@router.get("/meals")
def list_meals(
    school_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None),
    include_demo: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Meal).order_by(Meal.meal_date.desc(), Meal.id.desc())
    if school_id is not None:
        q = q.filter(Meal.school_id == school_id)
    if status_filter:
        q = q.filter(Meal.status == status_filter)
    if not include_demo:
        q = q.filter(Meal.is_demo == False)

    meals = q.limit(100).all()
    return [_serialize_meal(m) for m in meals]


@router.post("/meals", status_code=status.HTTP_201_CREATED)
def create_meal(
    payload: MealCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    school = db.query(School).filter(School.id == payload.school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="Selected school does not exist.")
    if payload.children_served <= 0:
        raise HTTPException(status_code=400, detail="children_served must be greater than 0.")

    meal = Meal(
        school_id=school.id,
        submitted_by=current_user.id,
        meal_date=payload.meal_date,
        meal_type=payload.meal_type.upper().strip(),
        scheme=payload.scheme or school.scheme,
        age_group=payload.age_group or school.default_age_group,
        children_served=payload.children_served,
        notes=payload.notes,
        status="PENDING_ANALYSIS",
        is_demo=payload.is_demo,
    )
    db.add(meal)
    db.flush()
    record_audit_log(
        db,
        current_user,
        "Meal",
        str(meal.id),
        "CREATE_MEAL",
        new_value={"school_id": meal.school_id, "meal_date": meal.meal_date, "meal_type": meal.meal_type},
        reason="Staff created meal record for analysis",
    )
    db.commit()
    db.refresh(meal)
    return _serialize_meal(meal)


@router.post("/meals/{meal_id}/analyze")
def analyze_meal(
    meal_id: int,
    image: Optional[UploadFile] = File(None),
    demo_preset: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Runs end-to-end AI analysis on either an uploaded meal photograph or a selectable Demo Meal preset.
    """
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal record not found.")

    if image is not None and image.filename:
        saved_path = _validate_and_save_upload(image, settings.UPLOAD_DIR)
        orig_name = image.filename
    elif demo_preset:
        preset_map = {
            "adequate": "demo_tray_adequate.jpg",
            "potential_shortfall": "demo_tray_potential_shortfall.jpg",
            "significant_shortfall": "demo_tray_significant_shortfall.jpg",
            "no_marker": "demo_tray_no_marker.jpg",
            "too_dark": "demo_tray_too_dark.jpg",
        }
        fname = preset_map.get(demo_preset, "demo_tray_adequate.jpg")
        saved_path = settings.DEMO_DIR / fname
        if not saved_path.exists():
            from scripts.make_synthetic_smoke_dataset import generate_synthetic_tray_image
            generate_synthetic_tray_image(saved_path, settings.TRAY_CONFIG_PATH, variant=demo_preset if demo_preset in preset_map else "adequate")
        orig_name = fname
        meal.is_demo = True
    else:
        raise HTTPException(
            status_code=400,
            detail="Please upload a meal tray image or select a Demo Meal preset.",
        )

    run_full_meal_analysis(db=db, meal=meal, image_path=saved_path, original_filename=orig_name)
    record_audit_log(
        db,
        current_user,
        "Meal",
        str(meal.id),
        "ANALYZE_MEAL",
        new_value={"status": meal.status, "confidence_tier": meal.overall_confidence_tier, "model_state": meal.model_state},
        reason=f"Ran AI nutrition analysis ({meal.model_state})",
    )
    db.commit()
    db.refresh(meal)
    return _serialize_meal(meal)


@router.get("/meals/{meal_id}")
def get_meal_detail(
    meal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found.")
    return _serialize_meal(meal)


@router.get("/meals/{meal_id}/nutrition")
def get_meal_nutrition(
    meal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found.")
    return _serialize_meal(meal)


@router.post("/meals/{meal_id}/flag-verification")
def staff_flag_meal_for_verification(
    meal_id: int,
    reason: str = Form("Staff requested manual officer verification"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found.")

    meal.requires_verification = True
    meal.verification_status = "PENDING"
    meal.verification_reason = reason
    db.add(
        VerificationRecord(
            meal_id=meal.id,
            officer_id=current_user.id,
            action="STAFF_FLAGGED",
            previous_value=None,
            new_value={"verification_status": "PENDING"},
            reason=reason,
            notes="Marked for verification by staff.",
        )
    )
    record_audit_log(
        db,
        current_user,
        "Meal",
        str(meal.id),
        "FLAG_FOR_VERIFICATION",
        new_value={"verification_status": "PENDING", "reason": reason},
        reason=reason,
    )
    db.commit()
    db.refresh(meal)
    return _serialize_meal(meal)


# ---------------------------------------------------------------------------
# 4. OFFICER DASHBOARD, TRENDS, PATTERNS & ANOMALIES
# ---------------------------------------------------------------------------
@router.get("/dashboard/summary")
def get_dashboard_summary(
    include_demo: bool = Query(False),
    school_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Meal).filter(
        Meal.status.in_(["ADEQUATE", "POTENTIAL_SHORTFALL", "SIGNIFICANT_SHORTFALL", "QUALITY_REJECTED"])
    )
    if not include_demo:
        q = q.filter(Meal.is_demo == False)
    if school_id is not None:
        q = q.filter(Meal.school_id == school_id)

    meals = q.order_by(Meal.meal_date.desc(), Meal.id.desc()).all()

    total_analyzed = len(meals)
    adequate = sum(1 for m in meals if m.status == "ADEQUATE")
    potential_shortfalls = sum(1 for m in meals if m.status == "POTENTIAL_SHORTFALL")
    significant_shortfalls = sum(1 for m in meals if m.status == "SIGNIFICANT_SHORTFALL")
    pending_verification = sum(1 for m in meals if m.verification_status == "PENDING")
    low_confidence = sum(1 for m in meals if m.overall_confidence_tier == "LOW")

    patterns = detect_school_shortfall_patterns(db, include_demo=include_demo)
    anomalies = detect_meal_anomalies(db, include_demo=include_demo)

    active_model_row = (
        db.query(ModelVersion)
        .filter(ModelVersion.is_active == True)
        .order_by(ModelVersion.trained_at.desc())
        .first()
    )
    model_info = food_recognition_module.get_active_model_info(active_model_row)

    recent_shortfalls = [
        _serialize_meal(m)
        for m in meals
        if m.status in ("POTENTIAL_SHORTFALL", "SIGNIFICANT_SHORTFALL")
    ][:10]

    return {
        "include_demo": include_demo,
        "total_meals_analyzed": total_analyzed,
        "adequate_count": adequate,
        "potential_shortfalls_count": potential_shortfalls,
        "significant_shortfalls_count": significant_shortfalls,
        "pending_verification_count": pending_verification,
        "low_confidence_count": low_confidence,
        "schools_requiring_attention": [p for p in patterns if p["pattern_type"] != "NONE"],
        "school_patterns": patterns,
        "anomalies": anomalies,
        "recent_shortfalls": recent_shortfalls,
        "active_model": model_info,
    }


@router.get("/dashboard/trends")
def get_dashboard_trends(
    include_demo: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        db.query(Meal)
        .filter(Meal.status.in_(["ADEQUATE", "POTENTIAL_SHORTFALL", "SIGNIFICANT_SHORTFALL"]))
        .order_by(Meal.meal_date.asc(), Meal.id.asc())
    )
    if not include_demo:
        q = q.filter(Meal.is_demo == False)

    meals = q.all()

    # Daily calorie & protein & shortfall trends
    by_date: Dict[str, Dict[str, Any]] = {}
    for m in meals:
        d = m.meal_date
        entry = by_date.setdefault(
            d,
            {"date": d, "cals": [], "prots": [], "targets_cal": [], "targets_prot": [], "adequate": 0, "potential": 0, "significant": 0},
        )
        if m.nutrition_record:
            entry["cals"].append(m.nutrition_record.total_calories_likely)
            entry["prots"].append(m.nutrition_record.total_protein_likely)
            entry["targets_cal"].append(m.nutrition_record.target_calories)
            entry["targets_prot"].append(m.nutrition_record.target_protein)
        if m.status == "ADEQUATE":
            entry["adequate"] += 1
        elif m.status == "POTENTIAL_SHORTFALL":
            entry["potential"] += 1
        elif m.status == "SIGNIFICANT_SHORTFALL":
            entry["significant"] += 1

    daily_trends = []
    for d, info in sorted(by_date.items()):
        daily_trends.append({
            "date": d,
            "avg_calories": round(sum(info["cals"]) / len(info["cals"]), 1) if info["cals"] else 0.0,
            "target_calories": round(sum(info["targets_cal"]) / len(info["targets_cal"]), 1) if info["targets_cal"] else 450.0,
            "avg_protein": round(sum(info["prots"]) / len(info["prots"]), 2) if info["prots"] else 0.0,
            "target_protein": round(sum(info["targets_prot"]) / len(info["targets_prot"]), 2) if info["targets_prot"] else 12.0,
            "adequate": info["adequate"],
            "potential_shortfall": info["potential"],
            "significant_shortfall": info["significant"],
        })

    # School comparison
    by_school: Dict[str, Dict[str, Any]] = {}
    for m in meals:
        sname = m.school.name if m.school else f"School #{m.school_id}"
        sc = by_school.setdefault(sname, {"school_name": sname, "cals": [], "prots": [], "shortfalls": 0, "total": 0})
        sc["total"] += 1
        if m.nutrition_record:
            sc["cals"].append(m.nutrition_record.total_calories_likely)
            sc["prots"].append(m.nutrition_record.total_protein_likely)
        if m.status in ("POTENTIAL_SHORTFALL", "SIGNIFICANT_SHORTFALL"):
            sc["shortfalls"] += 1

    school_comparison = [
        {
            "school_name": k,
            "avg_calories": round(sum(v["cals"]) / len(v["cals"]), 1) if v["cals"] else 0.0,
            "avg_protein": round(sum(v["prots"]) / len(v["prots"]), 2) if v["prots"] else 0.0,
            "shortfall_rate_pct": round((v["shortfalls"] / v["total"]) * 100.0, 1) if v["total"] else 0.0,
            "total_meals": v["total"],
        }
        for k, v in by_school.items()
    ]

    # Meal-type comparison
    by_type: Dict[str, Dict[str, Any]] = {}
    for m in meals:
        mt = m.meal_type
        t_entry = by_type.setdefault(mt, {"meal_type": mt, "cals": [], "prots": [], "count": 0})
        t_entry["count"] += 1
        if m.nutrition_record:
            t_entry["cals"].append(m.nutrition_record.total_calories_likely)
            t_entry["prots"].append(m.nutrition_record.total_protein_likely)

    meal_type_comparison = [
        {
            "meal_type": k,
            "avg_calories": round(sum(v["cals"]) / len(v["cals"]), 1) if v["cals"] else 0.0,
            "avg_protein": round(sum(v["prots"]) / len(v["prots"]), 2) if v["prots"] else 0.0,
            "count": v["count"],
        }
        for k, v in by_type.items()
    ]

    # Confidence tier distribution
    conf_dist = [
        {"tier": "HIGH", "count": sum(1 for m in meals if m.overall_confidence_tier == "HIGH")},
        {"tier": "MEDIUM", "count": sum(1 for m in meals if m.overall_confidence_tier == "MEDIUM")},
        {"tier": "LOW", "count": sum(1 for m in meals if m.overall_confidence_tier == "LOW")},
    ]

    return {
        "daily_trends": daily_trends,
        "school_comparison": school_comparison,
        "meal_type_comparison": meal_type_comparison,
        "confidence_distribution": conf_dist,
    }


# ---------------------------------------------------------------------------
# 5. HUMAN VERIFICATION & CANDIDATE TRAINING SAMPLES
# ---------------------------------------------------------------------------
@router.get("/verification/pending")
def list_pending_verifications(
    include_resolved: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["OFFICER", "ADMIN"])),
):
    q = db.query(Meal)
    if include_resolved:
        q = q.filter(Meal.requires_verification == True)
    else:
        q = q.filter(Meal.verification_status == "PENDING")

    meals = q.order_by(Meal.meal_date.desc(), Meal.id.desc()).all()
    return [_serialize_meal(m) for m in meals]


@router.post("/verification/{meal_id}")
def perform_verification_action(
    meal_id: int,
    payload: VerificationActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["OFFICER", "ADMIN"])),
):
    """
    Allows an Officer or Admin to:
    - VERIFY (confirm AI result)
    - CORRECT_FOOD (correct food label on a compartment detection & create candidate training sample)
    - CORRECT_PORTION (correct portion weight in grams, recalculate meal nutrition & status, & create candidate training sample)
    - REJECT (reject AI result)
    - ADD_NOTES (append verification note)
    Every modification is recorded in `verification_records` and `audit_logs`.
    """
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found.")

    action = payload.action.upper().strip()
    if action not in ("VERIFY", "CORRECT_FOOD", "CORRECT_PORTION", "REJECT", "ADD_NOTES"):
        raise HTTPException(status_code=400, detail="Unsupported verification action.")

    prev_val: Dict[str, Any] = {"verification_status": meal.verification_status, "status": meal.status}
    new_val: Dict[str, Any] = {}
    audit_summary = payload.reason

    if action == "VERIFY":
        meal.verification_status = "VERIFIED"
        new_val = {"verification_status": "VERIFIED"}
        audit_summary = f"Officer verified Meal #{meal.id}. Reason: {payload.reason}"

    elif action == "REJECT":
        meal.verification_status = "REJECTED"
        new_val = {"verification_status": "REJECTED"}
        audit_summary = f"Officer rejected AI result for Meal #{meal.id}. Reason: {payload.reason}"

    elif action == "ADD_NOTES":
        new_val = {"notes": payload.notes}
        audit_summary = f"Officer added verification notes to Meal #{meal.id}: {payload.notes or payload.reason}"

    elif action in ("CORRECT_FOOD", "CORRECT_PORTION"):
        det = None
        if payload.detection_id is not None:
            det = db.query(FoodDetection).filter(FoodDetection.id == payload.detection_id, FoodDetection.meal_id == meal.id).first()
        if det is None and meal.detections:
            det = meal.detections[0]
        if det is None:
            raise HTTPException(status_code=400, detail="No food detection found to correct on this meal.")

        old_food = det.detected_food_name
        old_grams = det.estimated_grams_likely
        prev_val = {
            "detection_id": det.id,
            "compartment_id": det.compartment_id,
            "food": old_food,
            "estimated_grams_likely": old_grams,
        }

        if action == "CORRECT_FOOD" and payload.corrected_food_name:
            new_food_name = payload.corrected_food_name.strip()
            food_item = (
                db.query(FoodItem)
                .filter(FoodItem.name.ilike(new_food_name) | FoodItem.code.ilike(new_food_name))
                .first()
            )
            det.detected_food_name = food_item.name if food_item else new_food_name
            det.food_item_id = food_item.id if food_item else None
            det.is_low_confidence = False
            det.calibrated_confidence = 1.0
            det.manually_corrected = True
            audit_summary = (
                f"Officer corrected food in {det.compartment_name}. "
                f"Previous: {old_food}. Updated: {det.detected_food_name}. Reason: {payload.reason}"
            )

        if payload.corrected_grams is not None and payload.corrected_grams >= 0:
            cg = float(payload.corrected_grams)
            det.estimated_grams_likely = round(cg, 1)
            det.estimated_grams_low = round(max(0.0, cg - 5.0), 1)
            det.estimated_grams_high = round(cg + 5.0, 1)
            det.manually_corrected = True
            if action == "CORRECT_PORTION":
                audit_summary = (
                    f"Officer corrected {det.detected_food_name} portion. "
                    f"Previous: {old_grams:.0f} g. Updated: {cg:.0f} g. Reason: {payload.reason}"
                )

        # Recompute item & meal nutrition after correction
        food_obj = db.query(FoodItem).filter(FoodItem.id == det.food_item_id).first() if det.food_item_id else None
        nutr_info = resolve_food_nutrition_per_100g(db, food_obj, school_id=meal.school_id)
        item_nutr = calculate_item_nutrition_range(
            det.estimated_grams_low,
            det.estimated_grams_likely,
            det.estimated_grams_high,
            nutr_info["calories_per_100g"],
            nutr_info["protein_per_100g"],
        )
        det.calories_low = item_nutr["calories_low"]
        det.calories_likely = item_nutr["calories_likely"]
        det.calories_high = item_nutr["calories_high"]
        det.protein_low = item_nutr["protein_low"]
        det.protein_likely = item_nutr["protein_likely"]
        det.protein_high = item_nutr["protein_high"]
        det.nutrition_missing = bool(nutr_info["missing"])
        det.nutrition_verified = bool(nutr_info["verified"])
        db.flush()

        # Recalculate total meal nutrition
        nr = meal.nutrition_record
        if nr:
            valid_dets = [d for d in meal.detections if not d.nutrition_missing]
            nr.total_calories_low = round(sum(float(d.calories_low or 0.0) for d in valid_dets), 1)
            nr.total_calories_likely = round(sum(float(d.calories_likely or 0.0) for d in valid_dets), 1)
            nr.total_calories_high = round(sum(float(d.calories_high or 0.0) for d in valid_dets), 1)
            nr.total_protein_low = round(sum(float(d.protein_low or 0.0) for d in valid_dets), 2)
            nr.total_protein_likely = round(sum(float(d.protein_likely or 0.0) for d in valid_dets), 2)
            nr.total_protein_high = round(sum(float(d.protein_high or 0.0) for d in valid_dets), 2)

            norm_eval = evaluate_norm_and_status(
                (nr.total_calories_low, nr.total_calories_likely, nr.total_calories_high),
                (nr.total_protein_low, nr.total_protein_likely, nr.total_protein_high),
                nr.target_calories,
                nr.target_protein,
                nr.tolerance_pct,
            )
            meal.status = str(norm_eval["status"])
            meal.status_explanation = str(norm_eval["explanation"]) + " (Updated after manual officer correction.)"
            nr.calorie_gap_likely = float(norm_eval["calorie_gap_likely"])
            nr.protein_gap_likely = float(norm_eval["protein_gap_likely"])
            nr.range_straddles_threshold = bool(norm_eval["range_straddles_threshold"])

        meal.verification_status = "CORRECTED"
        new_val = {
            "detection_id": det.id,
            "compartment_id": det.compartment_id,
            "food": det.detected_food_name,
            "estimated_grams_likely": det.estimated_grams_likely,
            "new_meal_status": meal.status,
        }

        # Save officer correction as a CANDIDATE training sample flagged `CANDIDATE_NEEDS_REVIEW`
        # (never auto-added to training without admin approval)
        img_path_str = meal.images[-1].file_path if meal.images else "corrected_sample.jpg"
        candidate_sample = DatasetSample(
            image_path=img_path_str,
            compartment_id=det.compartment_id,
            food_class=det.detected_food_name.lower().replace(" ", "_"),
            weighed_grams=det.estimated_grams_likely,
            geometric_estimate_g=det.geometric_grams,
            session_id=f"officer_corr_meal_{meal.id}",
            lighting_condition="Officer Verified Correction",
            device_model="Field Verification",
            photographer=current_user.email,
            split=None,
            status="CANDIDATE_NEEDS_REVIEW",
            quality_passed=True,
            source_meal_id=meal.id,
        )
        db.add(candidate_sample)

    verif_rec = VerificationRecord(
        meal_id=meal.id,
        officer_id=current_user.id,
        action=action,
        previous_value=prev_val,
        new_value=new_val,
        reason=audit_summary,
        notes=payload.notes,
    )
    db.add(verif_rec)

    record_audit_log(
        db,
        current_user,
        "MealVerification",
        str(meal.id),
        action,
        previous_value=prev_val,
        new_value=new_val,
        reason=audit_summary,
    )
    db.commit()
    db.refresh(meal)
    return _serialize_meal(meal)


# ---------------------------------------------------------------------------
# 6. AUDIT LOGS
# ---------------------------------------------------------------------------
@router.get("/audit-logs")
def list_audit_logs(
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["OFFICER", "ADMIN"])),
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "user_email": l.user_email,
            "user_role": l.user_role,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "action": l.action,
            "previous_value": l.previous_value,
            "new_value": l.new_value,
            "reason": l.reason,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]


# ---------------------------------------------------------------------------
# 7. DATA COLLECTION MODULE & DATASET PROGRESS
# ---------------------------------------------------------------------------
@router.post("/dataset/samples", status_code=status.HTTP_201_CREATED)
def collect_dataset_samples(
    image: UploadFile = File(...),
    session_id: str = Form(...),
    lighting_condition: str = Form("Indoor Natural"),
    device_model: str = Form("Android Smartphone"),
    photographer: str = Form("staff@thalicheck.gov.in"),
    compartments_json: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Data Collection mode endpoint (Section 16):
    - Uploads standardized tray photo
    - Immediately runs image quality gate
    - Extracts compartment crops into `data/dataset/<food_class>/`
    - Stores weighed grams per compartment in PostgreSQL `dataset_samples` and appends to `labels.csv`
    """
    saved_tray_path = _validate_and_save_upload(image, settings.UPLOAD_DIR)
    tray_cfg = get_active_tray_config_dict(db)
    q_check = run_image_quality_gate(saved_tray_path, tray_cfg)

    try:
        comp_items = json.loads(compartments_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid compartments_json format.")

    crops, comp_metrics = extract_compartment_crops(saved_tray_path, tray_cfg)
    created_samples = []

    labels_csv = settings.DATASET_DIR / "labels.csv"
    write_header = not labels_csv.exists()

    for item in comp_items:
        cid = item.get("compartment_id", "comp_4")
        food_class = str(item.get("food_class", "rice")).strip().lower().replace(" ", "_")
        weighed_g = float(item.get("weighed_grams", 0.0) or 0.0)
        if weighed_g < 0:
            continue

        crop_img = crops.get(cid)
        c_metric = comp_metrics.get(cid, {})
        class_dir = settings.DATASET_DIR / food_class
        class_dir.mkdir(parents=True, exist_ok=True)
        crop_filename = f"{food_class}_{session_id}_{cid}_{uuid.uuid4().hex[:6]}.jpg"
        crop_rel_path = f"{food_class}/{crop_filename}"
        crop_abs_path = settings.DATASET_DIR / crop_rel_path

        if crop_img is not None:
            crop_img.save(crop_abs_path, format="JPEG", quality=93)
        else:
            shutil.copyfile(saved_tray_path, crop_abs_path)

        fill_frac = float(c_metric.get("fill_fraction", 0.5))
        vol_ml = float(c_metric.get("configured_volume_ml", 175.0))
        geom_g = round(fill_frac * vol_ml * 0.88, 1)

        sample_row = DatasetSample(
            image_path=crop_rel_path,
            compartment_id=cid,
            food_class=food_class,
            weighed_grams=weighed_g,
            geometric_estimate_g=geom_g,
            session_id=session_id.strip(),
            lighting_condition=lighting_condition.strip(),
            device_model=device_model.strip(),
            photographer=photographer.strip() or current_user.email,
            split=None,
            status="APPROVED",
            quality_passed=bool(q_check["passed"]),
        )
        db.add(sample_row)
        db.flush()
        created_samples.append({
            "id": sample_row.id,
            "compartment_id": cid,
            "food_class": food_class,
            "weighed_grams": weighed_g,
            "image_path": crop_rel_path,
        })

        with open(labels_csv, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "image_path",
                    "food_class",
                    "compartment_id",
                    "weighed_grams",
                    "session_id",
                    "photographer",
                    "lighting_note",
                ],
            )
            if write_header:
                writer.writeheader()
                write_header = False
            writer.writerow({
                "image_path": crop_rel_path,
                "food_class": food_class,
                "compartment_id": cid,
                "weighed_grams": weighed_g,
                "session_id": session_id.strip(),
                "photographer": photographer.strip() or current_user.email,
                "lighting_note": lighting_condition.strip(),
            })

    record_audit_log(
        db,
        current_user,
        "DatasetCollection",
        session_id,
        "COLLECT_SAMPLES",
        new_value={"samples_added": len(created_samples), "quality_passed": q_check["passed"]},
        reason=f"Collected {len(created_samples)} labeled compartment samples in session {session_id}",
    )
    db.commit()

    return {
        "session_id": session_id,
        "quality_check": q_check,
        "samples_created": created_samples,
    }


@router.get("/dataset/progress")
def get_dataset_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    foods = db.query(FoodItem).order_by(FoodItem.id.asc()).all()
    samples = db.query(DatasetSample).all()

    approved = [s for s in samples if s.status == "APPROVED"]
    candidates = [s for s in samples if s.status == "CANDIDATE_NEEDS_REVIEW"]

    min_imgs = settings.MIN_DATASET_IMAGES_PER_CLASS
    min_cal = settings.MIN_CALIBRATION_SAMPLES

    class_progress = []
    for f in foods:
        code = f.code.lower()
        matching = [
            s for s in approved
            if s.food_class.lower() == code or s.food_class.lower() == f.name.lower()
        ]
        sessions = {s.session_id for s in matching}
        weighed_samples = [s for s in matching if s.weighed_grams > 0]

        cal_model = (
            db.query(CalibrationModel)
            .filter(CalibrationModel.food_item_id == f.id, CalibrationModel.is_active == True)
            .first()
        )
        cal_count = max(len(weighed_samples), cal_model.sample_count if cal_model else 0)

        class_progress.append({
            "food_id": f.id,
            "food_code": f.code,
            "food_name": f.name,
            "images_count": len(matching),
            "recommended_min_images": min_imgs,
            "meets_image_minimum": len(matching) >= min_imgs,
            "sessions_count": len(sessions),
            "calibration_samples_count": cal_count,
            "recommended_min_calibration": min_cal,
            "meets_calibration_minimum": cal_count >= min_cal,
        })

    return {
        "total_approved_samples": len(approved),
        "total_unique_sessions": len({s.session_id for s in approved}),
        "recommended_min_images_per_class": min_imgs,
        "recommended_min_calibration_samples": min_cal,
        "class_progress": class_progress,
        "candidate_samples": [
            {
                "id": c.id,
                "food_class": c.food_class,
                "compartment_id": c.compartment_id,
                "weighed_grams": c.weighed_grams,
                "session_id": c.session_id,
                "photographer": c.photographer,
                "source_meal_id": c.source_meal_id,
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in candidates
        ],
    }


@router.post("/dataset/candidates/{sample_id}/approve")
def approve_candidate_sample(
    sample_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
):
    sample = db.query(DatasetSample).filter(DatasetSample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Candidate sample not found.")
    sample.status = "APPROVED"
    record_audit_log(
        db,
        current_user,
        "DatasetSample",
        str(sample.id),
        "APPROVE_CANDIDATE_SAMPLE",
        previous_value={"status": "CANDIDATE_NEEDS_REVIEW"},
        new_value={"status": "APPROVED", "food_class": sample.food_class, "weighed_grams": sample.weighed_grams},
        reason="Admin approved officer correction for training dataset",
    )
    db.commit()
    return {"id": sample.id, "status": sample.status}


@router.post("/dataset/export")
def export_dataset_to_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    approved = db.query(DatasetSample).filter(DatasetSample.status == "APPROVED").all()
    settings.DATASET_DIR.mkdir(parents=True, exist_ok=True)
    labels_csv = settings.DATASET_DIR / "labels.csv"

    rows = []
    for s in approved:
        rows.append({
            "image_path": s.image_path,
            "food_class": s.food_class,
            "compartment_id": s.compartment_id,
            "weighed_grams": s.weighed_grams,
            "session_id": s.session_id,
            "photographer": s.photographer,
            "lighting_note": s.lighting_condition,
        })

    if rows:
        with open(labels_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "image_path",
                    "food_class",
                    "compartment_id",
                    "weighed_grams",
                    "session_id",
                    "photographer",
                    "lighting_note",
                ],
            )
            writer.writeheader()
            writer.writerows(rows)

    record_audit_log(
        db,
        current_user,
        "DatasetExport",
        "labels.csv",
        "EXPORT_DATASET",
        new_value={"exported_rows": len(rows), "path": str(labels_csv)},
        reason="Exported approved dataset samples to data/dataset/labels.csv",
    )
    db.commit()
    return {
        "exported_rows": len(rows),
        "labels_csv_path": str(labels_csv),
        "dataset_dir": str(settings.DATASET_DIR),
    }


# ---------------------------------------------------------------------------
# 8. PYTORCH MODEL TRAINING, EVALUATION & METRICS (BACKGROUND TASKS)
# ---------------------------------------------------------------------------
def _bg_train_task(epochs: int, quick_run: bool, generate_smoke_if_empty: bool):
    BACKGROUND_JOB_STATE["training"] = {
        "status": "RUNNING",
        "message": "Training PyTorch food classification model...",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "result": None,
    }
    db = SessionLocal()
    try:
        labels_csv = settings.DATASET_DIR / "labels.csv"
        if not labels_csv.exists() and generate_smoke_if_empty:
            from scripts.make_synthetic_smoke_dataset import make_synthetic_smoke_dataset
            make_synthetic_smoke_dataset(settings.DATASET_DIR, samples_per_class=10, num_sessions=6)

        from ai_models.train import run_training_pipeline
        meta = run_training_pipeline(
            dataset_dir=settings.DATASET_DIR,
            weights_dir=settings.MODEL_WEIGHTS_DIR,
            epochs=epochs,
            quick_run=quick_run,
        )

        db.query(ModelVersion).update({"is_active": False})
        mv = db.query(ModelVersion).filter(ModelVersion.version_tag == meta["version_tag"]).first()
        if not mv:
            mv = ModelVersion(
                version_tag=meta["version_tag"],
                architecture=meta["architecture"],
                weights_path=meta["weights_path"],
                metadata_path=str(settings.MODEL_WEIGHTS_DIR / "active_model_meta.json"),
                classes=meta["classes"],
                dataset_hash=meta["dataset_hash"],
                train_samples=meta["train_samples"],
                val_samples=meta["val_samples"],
                test_samples=meta["test_samples"],
                temperature_scale=meta["temperature_scale"],
                low_confidence_threshold=meta["low_confidence_threshold"],
                is_smoke_test=bool(meta["smoke_test_only"]),
                is_active=True,
            )
            db.add(mv)
        else:
            mv.is_active = True
            mv.temperature_scale = meta["temperature_scale"]
            mv.low_confidence_threshold = meta["low_confidence_threshold"]
        db.commit()

        BACKGROUND_JOB_STATE["training"] = {
            "status": "COMPLETED",
            "message": f"Trained model {meta['version_tag']} ({'SMOKE-TEST' if meta['smoke_test_only'] else 'REAL'}).",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "result": meta,
        }
    except Exception as exc:
        BACKGROUND_JOB_STATE["training"] = {
            "status": "FAILED",
            "message": str(exc),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "result": None,
        }
    finally:
        db.close()


def _bg_evaluate_task():
    BACKGROUND_JOB_STATE["evaluation"] = {
        "status": "RUNNING",
        "message": "Evaluating model on held-out test split...",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "result": None,
    }
    db = SessionLocal()
    try:
        from ai_models.evaluate import run_evaluation_pipeline
        metrics = run_evaluation_pipeline(
            dataset_dir=settings.DATASET_DIR,
            weights_dir=settings.MODEL_WEIGHTS_DIR,
            reports_dir=settings.MODEL_REPORTS_DIR,
        )

        active_mv = db.query(ModelVersion).filter(ModelVersion.is_active == True).first()
        if active_mv:
            db.add(
                ModelEvaluation(
                    model_version_id=active_mv.id,
                    metrics_json=metrics,
                    report_path=str(settings.MODEL_REPORTS_DIR / "metrics.json"),
                )
            )
            db.commit()

        BACKGROUND_JOB_STATE["evaluation"] = {
            "status": "COMPLETED",
            "message": f"Evaluation complete on {metrics['test_set_size']} test images.",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "result": metrics,
        }
    except Exception as exc:
        BACKGROUND_JOB_STATE["evaluation"] = {
            "status": "FAILED",
            "message": str(exc),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "result": None,
        }
    finally:
        db.close()


@router.post("/model/train")
def trigger_model_training(
    background_tasks: BackgroundTasks,
    epochs: int = Query(5, ge=1, le=50),
    quick_run: bool = Query(True),
    sync: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
):
    record_audit_log(
        db,
        current_user,
        "ModelTraining",
        "train.py",
        "TRIGGER_TRAINING",
        new_value={"epochs": epochs, "quick_run": quick_run},
        reason="Admin triggered PyTorch model training",
    )
    db.commit()

    if sync:
        _bg_train_task(epochs=epochs, quick_run=quick_run, generate_smoke_if_empty=True)
        return BACKGROUND_JOB_STATE["training"]

    background_tasks.add_task(_bg_train_task, epochs, quick_run, True)
    return {
        "status": "STARTED",
        "message": "Model training started in FastAPI background task.",
        "job": BACKGROUND_JOB_STATE["training"],
    }


@router.post("/model/evaluate")
def trigger_model_evaluation(
    background_tasks: BackgroundTasks,
    sync: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "OFFICER"])),
):
    record_audit_log(
        db,
        current_user,
        "ModelEvaluation",
        "evaluate.py",
        "TRIGGER_EVALUATION",
        reason="Triggered held-out test split evaluation",
    )
    db.commit()

    if sync:
        _bg_evaluate_task()
        return BACKGROUND_JOB_STATE["evaluation"]

    background_tasks.add_task(_bg_evaluate_task)
    return {
        "status": "STARTED",
        "message": "Model evaluation started in FastAPI background task.",
        "job": BACKGROUND_JOB_STATE["evaluation"],
    }


@router.get("/model/active")
def get_active_model_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    active_mv = (
        db.query(ModelVersion)
        .filter(ModelVersion.is_active == True)
        .order_by(ModelVersion.trained_at.desc())
        .first()
    )
    info = food_recognition_module.get_active_model_info(active_mv)
    info["background_jobs"] = BACKGROUND_JOB_STATE
    return info


@router.get("/model/metrics")
def get_model_evaluation_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Honesty rule (Section 2):
    Every accuracy number shown in the UI must be read from a real evaluation output (`ai_models/reports/metrics.json`).
    If no evaluation exists, returns `evaluated: false` and message `"No trained model evaluated yet."`
    """
    metrics_path = settings.MODEL_REPORTS_DIR / "metrics.json"
    if not metrics_path.exists():
        return {
            "evaluated": False,
            "message": "No trained model evaluated yet.",
            "metrics": None,
            "background_jobs": BACKGROUND_JOB_STATE,
        }

    try:
        with open(metrics_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {
            "evaluated": True,
            "message": (
                "SMOKE-TEST MODEL: evaluated on synthetic smoke dataset (not a real food model)."
                if data.get("smoke_test_only")
                else "Evaluated on held-out test split."
            ),
            "metrics": data,
            "background_jobs": BACKGROUND_JOB_STATE,
        }
    except Exception as exc:
        return {
            "evaluated": False,
            "message": f"No trained model evaluated yet ({exc}).",
            "metrics": None,
            "background_jobs": BACKGROUND_JOB_STATE,
        }


# ---------------------------------------------------------------------------
# 9. SCALE PORTION CALIBRATION
# ---------------------------------------------------------------------------
@router.get("/calibration")
def list_all_calibration_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    foods = db.query(FoodItem).order_by(FoodItem.id.asc()).all()
    out = []
    for f in foods:
        cal = (
            db.query(CalibrationModel)
            .filter(CalibrationModel.food_item_id == f.id, CalibrationModel.is_active == True)
            .order_by(CalibrationModel.trained_at.desc())
            .first()
        )
        out.append({
            "food_id": f.id,
            "food_code": f.code,
            "food_name": f.name,
            "density_g_per_ml": f.density_g_per_ml,
            "calibration": {
                "version": cal.version,
                "sample_count": cal.sample_count,
                "is_calibrated": cal.is_calibrated,
                "slope": cal.slope,
                "intercept": cal.intercept,
                "residual_p10_g": cal.residual_p10_g,
                "residual_p50_g": cal.residual_p50_g,
                "residual_p90_g": cal.residual_p90_g,
                "mae_g": cal.mae_g,
                "mape_pct": cal.mape_pct,
                "trained_at": cal.trained_at.isoformat() if cal.trained_at else None,
            } if cal else None,
        })
    return out


@router.get("/calibration/{food_id}")
def get_food_calibration(
    food_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    food = db.query(FoodItem).filter(FoodItem.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food item not found.")
    cal = (
        db.query(CalibrationModel)
        .filter(CalibrationModel.food_item_id == food.id, CalibrationModel.is_active == True)
        .order_by(CalibrationModel.trained_at.desc())
        .first()
    )
    return {
        "food_id": food.id,
        "food_name": food.name,
        "min_required_samples": settings.MIN_CALIBRATION_SAMPLES,
        "calibration": {
            "version": cal.version,
            "sample_count": cal.sample_count,
            "is_calibrated": cal.is_calibrated,
            "slope": cal.slope,
            "intercept": cal.intercept,
            "residual_p10_g": cal.residual_p10_g,
            "residual_p50_g": cal.residual_p50_g,
            "residual_p90_g": cal.residual_p90_g,
            "mae_g": cal.mae_g,
            "mape_pct": cal.mape_pct,
        } if cal else None,
    }


@router.post("/calibration/fit")
def fit_calibration_endpoint(
    food_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
):
    if food_id is not None:
        foods = db.query(FoodItem).filter(FoodItem.id == food_id).all()
    else:
        foods = db.query(FoodItem).all()

    fitted = []
    for f in foods:
        cal = fit_portion_calibration_for_food(db, f)
        fitted.append({
            "food_id": f.id,
            "food_name": f.name,
            "version": cal.version,
            "sample_count": cal.sample_count,
            "is_calibrated": cal.is_calibrated,
            "slope": cal.slope,
            "intercept": cal.intercept,
            "residual_p10_g": cal.residual_p10_g,
            "residual_p90_g": cal.residual_p90_g,
            "mae_g": cal.mae_g,
        })

    record_audit_log(
        db,
        current_user,
        "CalibrationModel",
        str(food_id or "all"),
        "FIT_PORTION_CALIBRATION",
        new_value={"fitted_count": len(fitted)},
        reason="Admin ran scale portion regression calibration",
    )
    db.commit()
    return {"fitted_models": fitted}


# ---------------------------------------------------------------------------
# 10. ADMIN CRUD: FOODS, RECIPES, NORMS, TRAY CONFIG
# ---------------------------------------------------------------------------
@router.get("/foods")
def list_foods(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    foods = db.query(FoodItem).order_by(FoodItem.id.asc()).all()
    return [
        {
            "id": f.id,
            "code": f.code,
            "name": f.name,
            "category": f.category,
            "calories_per_100g": f.calories_per_100g,
            "protein_per_100g": f.protein_per_100g,
            "carbs_per_100g": f.carbs_per_100g,
            "fat_per_100g": f.fat_per_100g,
            "fiber_per_100g": f.fiber_per_100g,
            "density_g_per_ml": f.density_g_per_ml,
            "source": f.source,
            "source_reference": f.source_reference,
            "verified": f.verified,
            "last_reviewed": f.last_reviewed.isoformat() if f.last_reviewed else None,
            "is_recipe_based": f.is_recipe_based,
        }
        for f in foods
    ]


@router.post("/foods", status_code=status.HTTP_201_CREATED)
def create_food_item(
    payload: FoodItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
):
    existing = db.query(FoodItem).filter(
        FoodItem.code.ilike(payload.code.strip()) | FoodItem.name.ilike(payload.name.strip())
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Food item with that code or name already exists.")

    food = FoodItem(
        code=payload.code.strip().lower().replace(" ", "_"),
        name=payload.name.strip(),
        category=payload.category.strip(),
        calories_per_100g=payload.calories_per_100g,
        protein_per_100g=payload.protein_per_100g,
        carbs_per_100g=payload.carbs_per_100g,
        fat_per_100g=payload.fat_per_100g,
        fiber_per_100g=payload.fiber_per_100g,
        density_g_per_ml=payload.density_g_per_ml,
        source=payload.source,
        source_reference=payload.source_reference,
        verified=payload.verified,
        last_reviewed=datetime.now(timezone.utc) if payload.verified else None,
        is_recipe_based=payload.is_recipe_based,
    )
    db.add(food)
    db.flush()
    record_audit_log(
        db,
        current_user,
        "FoodItem",
        str(food.id),
        "CREATE_FOOD",
        new_value={"name": food.name, "calories_per_100g": food.calories_per_100g, "verified": food.verified},
        reason="Admin added food item to nutrition database",
    )
    db.commit()
    db.refresh(food)
    return food


@router.put("/foods/{food_id}")
def update_food_item(
    food_id: int,
    payload: FoodItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
):
    food = db.query(FoodItem).filter(FoodItem.id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food item not found.")

    prev = {
        "calories_per_100g": food.calories_per_100g,
        "protein_per_100g": food.protein_per_100g,
        "density_g_per_ml": food.density_g_per_ml,
        "verified": food.verified,
    }

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(food, field, val)

    if payload.verified is True:
        food.last_reviewed = datetime.now(timezone.utc)

    record_audit_log(
        db,
        current_user,
        "FoodItem",
        str(food.id),
        "UPDATE_FOOD",
        previous_value=prev,
        new_value={
            "calories_per_100g": food.calories_per_100g,
            "protein_per_100g": food.protein_per_100g,
            "density_g_per_ml": food.density_g_per_ml,
            "verified": food.verified,
        },
        reason=f"Admin updated nutrition/density/verification for {food.name}",
    )
    db.commit()
    db.refresh(food)
    return food


@router.get("/recipes")
def list_recipes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recipes = db.query(Recipe).order_by(Recipe.id.asc()).all()
    out = []
    for r in recipes:
        comp = compute_recipe_nutrition_per_100g(r)
        out.append({
            "id": r.id,
            "food_item_id": r.food_item_id,
            "food_name": r.food_item.name if r.food_item else "",
            "school_id": r.school_id,
            "school_name": r.school.name if r.school else "All Schools (Default Formulation)",
            "name": r.name,
            "cooking_yield_factor": r.cooking_yield_factor,
            "serving_size_g": r.serving_size_g,
            "notes": r.notes,
            "verified": r.verified,
            "computed_per_100g": comp,
            "ingredients": [
                {
                    "id": ing.id,
                    "ingredient_name": ing.ingredient_name,
                    "raw_weight_g": ing.raw_weight_g,
                    "calories_per_100g": ing.calories_per_100g,
                    "protein_per_100g": ing.protein_per_100g,
                    "carbs_per_100g": ing.carbs_per_100g,
                }
                for ing in r.ingredients
            ],
        })
    return out


@router.post("/recipes", status_code=status.HTTP_201_CREATED)
def create_or_update_recipe(
    payload: RecipeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
):
    r = Recipe(
        food_item_id=payload.food_item_id,
        school_id=payload.school_id,
        name=payload.name.strip(),
        cooking_yield_factor=payload.cooking_yield_factor,
        serving_size_g=payload.serving_size_g,
        notes=payload.notes,
        verified=payload.verified,
    )
    db.add(r)
    db.flush()
    for ing in payload.ingredients:
        db.add(
            RecipeIngredient(
                recipe_id=r.id,
                ingredient_name=ing.ingredient_name.strip(),
                raw_weight_g=ing.raw_weight_g,
                calories_per_100g=ing.calories_per_100g,
                protein_per_100g=ing.protein_per_100g,
                carbs_per_100g=ing.carbs_per_100g,
            )
        )
    db.flush()
    comp = compute_recipe_nutrition_per_100g(r)
    record_audit_log(
        db,
        current_user,
        "Recipe",
        str(r.id),
        "SAVE_RECIPE",
        new_value={"name": r.name, "computed_per_100g": comp},
        reason="Admin saved recipe formulation",
    )
    db.commit()
    return {"id": r.id, "name": r.name, "computed_per_100g": comp}


@router.get("/norms")
def list_norms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    norms = db.query(NutritionNorm).filter(NutritionNorm.is_active == True).order_by(NutritionNorm.id.asc()).all()
    return [
        {
            "id": n.id,
            "scheme": n.scheme,
            "age_group": n.age_group,
            "meal_type": n.meal_type,
            "calorie_target": n.calorie_target,
            "protein_target": n.protein_target,
            "tolerance_pct": n.tolerance_pct,
            "severe_shortfall_pct": n.severe_shortfall_pct,
            "description": n.description,
        }
        for n in norms
    ]


@router.post("/norms", status_code=status.HTTP_201_CREATED)
def create_or_update_norm(
    payload: NutritionNormCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
):
    existing = (
        db.query(NutritionNorm)
        .filter(
            NutritionNorm.scheme == payload.scheme,
            NutritionNorm.age_group == payload.age_group,
            NutritionNorm.meal_type == payload.meal_type.upper(),
        )
        .first()
    )
    if existing:
        prev = {"calorie_target": existing.calorie_target, "protein_target": existing.protein_target}
        existing.calorie_target = payload.calorie_target
        existing.protein_target = payload.protein_target
        existing.tolerance_pct = payload.tolerance_pct
        existing.severe_shortfall_pct = payload.severe_shortfall_pct
        existing.description = payload.description
        norm = existing
        action_str = "UPDATE_NORM"
    else:
        prev = None
        norm = NutritionNorm(
            scheme=payload.scheme.strip(),
            age_group=payload.age_group.strip(),
            meal_type=payload.meal_type.upper().strip(),
            calorie_target=payload.calorie_target,
            protein_target=payload.protein_target,
            tolerance_pct=payload.tolerance_pct,
            severe_shortfall_pct=payload.severe_shortfall_pct,
            description=payload.description,
        )
        db.add(norm)
        action_str = "CREATE_NORM"

    db.flush()
    record_audit_log(
        db,
        current_user,
        "NutritionNorm",
        str(norm.id),
        action_str,
        previous_value=prev,
        new_value={
            "scheme": norm.scheme,
            "age_group": norm.age_group,
            "meal_type": norm.meal_type,
            "calorie_target": norm.calorie_target,
            "protein_target": norm.protein_target,
        },
        reason="Admin updated configurable nutritional norm",
    )
    db.commit()
    db.refresh(norm)
    return norm


@router.get("/tray-config")
def get_tray_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_active_tray_config_dict(db)


@router.put("/tray-config")
def update_tray_config(
    payload: TrayConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN"])),
):
    prev = get_active_tray_config_dict(db)
    db.query(TrayConfig).update({"is_active": False})

    row = TrayConfig(
        tray_name=payload.tray_name,
        version=payload.version,
        tray_width_cm=payload.tray_width_cm,
        tray_height_cm=payload.tray_height_cm,
        marker_config=payload.marker,
        compartments_config=payload.compartments,
        default_meal_mapping=payload.default_meal_mapping,
        is_active=True,
    )
    db.add(row)

    # Also persist to `data/tray/tray_config.json`
    cfg_dict = {
        "tray_name": payload.tray_name,
        "version": payload.version,
        "tray_width_cm": payload.tray_width_cm,
        "tray_height_cm": payload.tray_height_cm,
        "marker": payload.marker,
        "compartments": payload.compartments,
        "default_meal_mapping": payload.default_meal_mapping,
    }
    with open(settings.TRAY_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg_dict, f, indent=2)

    record_audit_log(
        db,
        current_user,
        "TrayConfig",
        payload.version,
        "UPDATE_TRAY_CONFIG",
        previous_value={"version": prev.get("version")},
        new_value={"version": payload.version, "tray_name": payload.tray_name},
        reason="Admin updated standardized tray geometry and marker configuration",
    )
    db.commit()
    return cfg_dict
