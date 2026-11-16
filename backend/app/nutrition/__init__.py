import csv
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.config import settings
from app.models import FoodItem, Recipe, RecipeIngredient, NutritionNorm


def seed_foods_from_csv(db: Session, csv_path: Optional[Path] = None) -> int:
    path = csv_path or settings.FOODS_SEED_PATH
    if not path.exists():
        return 0

    inserted = 0
    with open(path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = row["code"].strip()
            existing = db.query(FoodItem).filter(FoodItem.code == code).first()
            if existing:
                continue

            def _parse_float(val: str) -> Optional[float]:
                val = (val or "").strip()
                if val == "":
                    return None
                return float(val)

            verified_flag = row.get("verified", "false").strip().lower() == "true"
            is_recipe = row.get("is_recipe_based", "false").strip().lower() == "true"

            food = FoodItem(
                code=code,
                name=row["name"].strip(),
                category=row.get("category", "General").strip(),
                calories_per_100g=_parse_float(row.get("calories_per_100g", "")),
                protein_per_100g=_parse_float(row.get("protein_per_100g", "")),
                carbs_per_100g=_parse_float(row.get("carbs_per_100g", "")),
                fat_per_100g=_parse_float(row.get("fat_per_100g", "0")),
                fiber_per_100g=_parse_float(row.get("fiber_per_100g", "0")),
                density_g_per_ml=float(row.get("density_g_per_ml", "0.85") or 0.85),
                source=row.get("source", "IFCT 2017").strip(),
                source_reference=row.get("source_reference", "").strip() or None,
                verified=verified_flag,
                is_recipe_based=is_recipe,
            )
            db.add(food)
            inserted += 1

    db.commit()
    return inserted


def compute_recipe_nutrition_per_100g(recipe: Recipe) -> Optional[Dict[str, float]]:
    """
    Computes cooked dish nutrition per 100g from raw ingredient weights and cooking yield factor.
    Cooked total weight = sum(raw_weight_g) * cooking_yield_factor (if yield factor represents expansion)
    or if cooking_yield_factor is directly total cooked weight ratio vs raw weight.
    """
    if not recipe.ingredients:
        return None

    total_raw_g = sum(ing.raw_weight_g for ing in recipe.ingredients)
    if total_raw_g <= 0 or recipe.cooking_yield_factor <= 0:
        return None

    cooked_total_g = total_raw_g * recipe.cooking_yield_factor
    total_cal = sum((ing.raw_weight_g / 100.0) * ing.calories_per_100g for ing in recipe.ingredients)
    total_prot = sum((ing.raw_weight_g / 100.0) * ing.protein_per_100g for ing in recipe.ingredients)
    total_carbs = sum((ing.raw_weight_g / 100.0) * ing.carbs_per_100g for ing in recipe.ingredients)

    return {
        "calories_per_100g": round((total_cal / cooked_total_g) * 100.0, 2),
        "protein_per_100g": round((total_prot / cooked_total_g) * 100.0, 2),
        "carbs_per_100g": round((total_carbs / cooked_total_g) * 100.0, 2),
    }


def resolve_food_nutrition_per_100g(
    db: Session,
    food_item: Optional[FoodItem],
    school_id: Optional[int] = None,
) -> Dict[str, object]:
    """
    Resolves nutrition per 100g for a detected food item.
    Never fabricates a missing nutrition value.
    If the food item has a school-specific or default recipe with ingredients, computes from recipe.
    """
    if food_item is None:
        return {
            "missing": True,
            "verified": False,
            "source": "unmapped",
            "calories_per_100g": None,
            "protein_per_100g": None,
            "reason": "Food class is unmapped or unknown.",
        }

    # Check if recipe-based dish has an active recipe for this school or default
    if food_item.is_recipe_based:
        recipe = None
        if school_id is not None:
            recipe = (
                db.query(Recipe)
                .filter(Recipe.food_item_id == food_item.id, Recipe.school_id == school_id)
                .first()
            )
        if recipe is None:
            recipe = (
                db.query(Recipe)
                .filter(Recipe.food_item_id == food_item.id, Recipe.school_id.is_(None))
                .first()
            )
        if recipe and recipe.ingredients:
            computed = compute_recipe_nutrition_per_100g(recipe)
            if computed:
                return {
                    "missing": False,
                    "verified": bool(recipe.verified and food_item.verified),
                    "source": f"Recipe: {recipe.name}",
                    "calories_per_100g": computed["calories_per_100g"],
                    "protein_per_100g": computed["protein_per_100g"],
                    "reason": None,
                }

    if food_item.calories_per_100g is None or food_item.protein_per_100g is None:
        return {
            "missing": True,
            "verified": False,
            "source": food_item.source,
            "calories_per_100g": None,
            "protein_per_100g": None,
            "reason": f"Nutrition values missing in database for '{food_item.name}'. Excluded from totals.",
        }

    return {
        "missing": False,
        "verified": bool(food_item.verified),
        "source": food_item.source,
        "calories_per_100g": float(food_item.calories_per_100g),
        "protein_per_100g": float(food_item.protein_per_100g),
        "reason": None,
    }


def calculate_item_nutrition_range(
    grams_low: float,
    grams_likely: float,
    grams_high: float,
    calories_per_100g: Optional[float],
    protein_per_100g: Optional[float],
) -> Dict[str, Optional[float]]:
    if calories_per_100g is None or protein_per_100g is None:
        return {
            "calories_low": None,
            "calories_likely": None,
            "calories_high": None,
            "protein_low": None,
            "protein_likely": None,
            "protein_high": None,
        }

    g_low = max(0.0, float(grams_low))
    g_likely = max(g_low, float(grams_likely))
    g_high = max(g_likely, float(grams_high))

    return {
        "calories_low": round((g_low * calories_per_100g) / 100.0, 1),
        "calories_likely": round((g_likely * calories_per_100g) / 100.0, 1),
        "calories_high": round((g_high * calories_per_100g) / 100.0, 1),
        "protein_low": round((g_low * protein_per_100g) / 100.0, 2),
        "protein_likely": round((g_likely * protein_per_100g) / 100.0, 2),
        "protein_high": round((g_high * protein_per_100g) / 100.0, 2),
    }


def evaluate_norm_and_status(
    calories_range: Tuple[float, float, float],
    protein_range: Tuple[float, float, float],
    target_calories: float,
    target_protein: float,
    tolerance_pct: float = 10.0,
    severe_shortfall_pct: float = 22.0,
) -> Dict[str, object]:
    """
    Compares estimated calorie and protein ranges against configurable norms.
    Never states 'This school violated the nutrition rules.'
    Uses range-straddle logic: if the estimated range [low, high] straddles the target threshold,
    status is POTENTIAL_SHORTFALL with note 'estimate range overlaps threshold'.
    """
    cal_low, cal_likely, cal_high = calories_range
    prot_low, prot_likely, prot_high = protein_range

    cal_min_acceptable = target_calories * (1.0 - (tolerance_pct / 100.0))
    prot_min_acceptable = target_protein * (1.0 - (tolerance_pct / 100.0))

    cal_severe_cutoff = target_calories * (1.0 - (severe_shortfall_pct / 100.0))
    prot_severe_cutoff = target_protein * (1.0 - (severe_shortfall_pct / 100.0))

    cal_straddles = cal_low < target_calories <= cal_high
    prot_straddles = prot_low < target_protein <= prot_high
    range_straddles = bool(cal_straddles or prot_straddles)

    # Check if high end is still substantially below threshold -> SIGNIFICANT_SHORTFALL
    if cal_high < cal_severe_cutoff or prot_high < prot_severe_cutoff or (
        cal_likely < cal_severe_cutoff or prot_likely < prot_severe_cutoff
    ):
        status = "SIGNIFICANT_SHORTFALL"
        explanation = (
            "Potential nutritional shortfall detected (significantly below target norms). "
            "Human verification recommended. Note: AI output is an early-warning estimate, not an official violation."
        )
    elif range_straddles:
        status = "POTENTIAL_SHORTFALL"
        explanation = (
            "Potential nutritional shortfall detected: estimate range overlaps threshold. "
            "Human verification recommended."
        )
    elif cal_low >= cal_min_acceptable and prot_low >= prot_min_acceptable and cal_likely >= target_calories * 0.97 and prot_likely >= target_protein * 0.97:
        status = "ADEQUATE"
        explanation = (
            "Estimated meal nutrition appears to meet the configured calorie and protein norms within range."
        )
    else:
        status = "POTENTIAL_SHORTFALL"
        explanation = (
            "Potential nutritional shortfall detected (close to or slightly below configured norm threshold). "
            "Human verification recommended."
        )

    return {
        "status": status,
        "explanation": explanation,
        "range_straddles_threshold": range_straddles,
        "calorie_gap_likely": round(cal_likely - target_calories, 1),
        "protein_gap_likely": round(prot_likely - target_protein, 2),
    }


def compute_overall_confidence(
    classification_confidences: List[float],
    quality_score: float,
    marker_detected: bool,
    all_portions_calibrated: bool,
    all_nutrition_verified: bool,
    has_missing_nutrition: bool,
    low_confidence_threshold: float = 0.65,
) -> Dict[str, object]:
    """
    Combines critical factors into an overall confidence tier (HIGH / MEDIUM / LOW) and percentage.
    Rule: Overall confidence can NEVER exceed the weakest critical factor's tier.
    """
    tier_rank = {"LOW": 1, "MEDIUM": 2, "HIGH": 3}
    rank_to_tier = {1: "LOW", 2: "MEDIUM", 3: "HIGH"}

    if not classification_confidences:
        min_cls_conf = 0.0
        avg_cls_conf = 0.0
    else:
        min_cls_conf = float(min(classification_confidences))
        avg_cls_conf = float(sum(classification_confidences) / len(classification_confidences))

    # 1. Classification confidence tier
    if min_cls_conf < low_confidence_threshold:
        cls_tier = "LOW"
    elif min_cls_conf < 0.82:
        cls_tier = "MEDIUM"
    else:
        cls_tier = "HIGH"

    # 2. Image quality & marker tier
    if not marker_detected or quality_score < 0.55:
        img_tier = "LOW"
    elif quality_score < 0.78:
        img_tier = "MEDIUM"
    else:
        img_tier = "HIGH"

    # 3. Portion calibration status tier
    # Uncalibrated portion estimates cap confidence at MEDIUM (or LOW if missing data)
    portion_tier = "HIGH" if all_portions_calibrated else "MEDIUM"

    # 4. Nutrition data status tier
    if has_missing_nutrition:
        nutr_tier = "LOW"
    elif not all_nutrition_verified:
        nutr_tier = "MEDIUM"
    else:
        nutr_tier = "HIGH"

    factors = {
        "classification_tier": cls_tier,
        "min_classification_confidence": round(min_cls_conf, 3),
        "avg_classification_confidence": round(avg_cls_conf, 3),
        "image_quality_tier": img_tier,
        "image_quality_score": round(quality_score, 3),
        "marker_detected": marker_detected,
        "portion_calibration_tier": portion_tier,
        "all_portions_calibrated": all_portions_calibrated,
        "nutrition_data_tier": nutr_tier,
        "all_nutrition_verified": all_nutrition_verified,
        "has_missing_nutrition": has_missing_nutrition,
    }

    weakest_rank = min(
        tier_rank[cls_tier],
        tier_rank[img_tier],
        tier_rank[portion_tier],
        tier_rank[nutr_tier],
    )
    overall_tier = rank_to_tier[weakest_rank]

    raw_pct = (
        0.45 * avg_cls_conf
        + 0.25 * quality_score
        + 0.15 * (1.0 if all_portions_calibrated else 0.65)
        + 0.15 * (0.3 if has_missing_nutrition else (1.0 if all_nutrition_verified else 0.72))
    ) * 100.0

    # Cap percentage so it aligns cleanly with the capped tier
    if overall_tier == "LOW":
        capped_pct = min(raw_pct, 62.0)
    elif overall_tier == "MEDIUM":
        capped_pct = min(max(raw_pct, 63.0), 82.0)
    else:
        capped_pct = max(raw_pct, 83.0)

    return {
        "tier": overall_tier,
        "percentage": round(capped_pct, 1),
        "breakdown": factors,
    }


def should_create_verification_task(
    status: str,
    overall_confidence_tier: str,
    has_low_confidence_detection: bool,
    has_missing_nutrition: bool,
) -> Tuple[bool, Optional[str]]:
    """
    Determines whether a meal must be automatically flagged for human verification.
    Rules from Section 13:
    - SIGNIFICANT_SHORTFALL with LOW confidence automatically creates a verification task.
    - ADEQUATE with LOW confidence also creates a verification task (to catch false reassurance).
    - Low-confidence food detection or SIGNIFICANT_SHORTFALL or missing nutrition flags verification.
    """
    reasons = []
    if status == "SIGNIFICANT_SHORTFALL" and overall_confidence_tier == "LOW":
        reasons.append("Significant shortfall with low confidence")
    elif status == "SIGNIFICANT_SHORTFALL":
        reasons.append("Significant nutritional shortfall detected")

    if status == "ADEQUATE" and overall_confidence_tier == "LOW":
        reasons.append("Adequate status with low overall confidence (false-reassurance safeguard)")

    if has_low_confidence_detection:
        reasons.append("Low-confidence food detection")

    if overall_confidence_tier == "LOW" and status == "POTENTIAL_SHORTFALL":
        reasons.append("Potential shortfall with low overall confidence")

    if has_missing_nutrition:
        reasons.append("Missing nutrition database value for detected item")

    if reasons:
        return True, "; ".join(reasons)
    return False, None
