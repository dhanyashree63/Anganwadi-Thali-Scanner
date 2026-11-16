from typing import Any, Dict, List
import numpy as np
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session
from app.models import Meal, NutritionRecord, School


def detect_school_shortfall_patterns(
    db: Session,
    include_demo: bool = False,
) -> List[Dict[str, Any]]:
    """
    Distinguishes between:
    - Single anomaly (1 shortfall in recent history)
    - Repeated shortfall (2-3 shortfalls in recent meals)
    - Persistent pattern (4+ shortfalls or >=50% shortfall rate across multiple verified/analyzed meals)
    Never labels a school as violating a rule; outputs early-warning monitoring recommendations.
    """
    schools = db.query(School).filter(School.is_active == True).all()
    results: List[Dict[str, Any]] = []

    for school in schools:
        q = (
            db.query(Meal)
            .filter(
                Meal.school_id == school.id,
                Meal.status.in_(["ADEQUATE", "POTENTIAL_SHORTFALL", "SIGNIFICANT_SHORTFALL"]),
            )
            .order_by(Meal.meal_date.desc(), Meal.id.desc())
        )
        if not include_demo:
            q = q.filter(Meal.is_demo == False)

        meals = q.all()
        if not meals:
            continue

        total = len(meals)
        shortfall_meals = [
            m for m in meals if m.status in ("POTENTIAL_SHORTFALL", "SIGNIFICANT_SHORTFALL")
        ]
        sig_shortfalls = [m for m in meals if m.status == "SIGNIFICANT_SHORTFALL"]
        verified_shortfalls = [
            m for m in shortfall_meals if m.verification_status in ("VERIFIED", "CORRECTED")
        ]

        # Compute consecutive shortfalls from most recent meals
        consecutive = 0
        for m in meals:
            if m.status in ("POTENTIAL_SHORTFALL", "SIGNIFICANT_SHORTFALL"):
                consecutive += 1
            else:
                break

        shortfall_count = len(shortfall_meals)
        shortfall_rate = shortfall_count / float(total)

        if shortfall_count == 0:
            pattern_type = "NONE"
            recommendation = "Meals within expected nutrition parameters."
            flag_for_inspection = False
        elif shortfall_count == 1 and len(sig_shortfalls) <= 1:
            pattern_type = "SINGLE_ANOMALY"
            recommendation = "Single potential shortfall observed. Routine monitoring recommended."
            flag_for_inspection = False
        elif (shortfall_count >= 4 or (shortfall_count >= 3 and shortfall_rate >= 0.5)) or len(verified_shortfalls) >= 3:
            pattern_type = "PERSISTENT_PATTERN"
            recommendation = (
                "Persistent nutritional shortfall pattern across multiple meals. "
                "Field officer review and kitchen ration support check recommended."
            )
            flag_for_inspection = True
        else:
            pattern_type = "REPEATED_SHORTFALL"
            recommendation = (
                "Repeated potential nutritional shortfalls detected. "
                "Human verification and menu compliance review recommended."
            )
            flag_for_inspection = len(verified_shortfalls) >= 2 or consecutive >= 2

        results.append({
            "school_id": school.id,
            "school_code": school.code,
            "school_name": school.name,
            "district": school.district,
            "block": school.block,
            "scheme": school.scheme,
            "total_meals": total,
            "shortfall_count": shortfall_count,
            "significant_shortfall_count": len(sig_shortfalls),
            "verified_shortfall_count": len(verified_shortfalls),
            "consecutive_recent_shortfalls": consecutive,
            "shortfall_rate_pct": round(shortfall_rate * 100.0, 1),
            "pattern_type": pattern_type,
            "flag_for_inspection": flag_for_inspection,
            "recommendation": recommendation,
        })

    # Sort persistent patterns first, then repeated shortfalls
    priority = {"PERSISTENT_PATTERN": 0, "REPEATED_SHORTFALL": 1, "SINGLE_ANOMALY": 2, "NONE": 3}
    results.sort(key=lambda r: (priority.get(r["pattern_type"], 9), -r["shortfall_rate_pct"]))
    return results


def detect_meal_anomalies(
    db: Session,
    include_demo: bool = False,
) -> List[Dict[str, Any]]:
    """
    Uses statistical checks + Scikit-learn IsolationForest to detect:
    1. Unusually low or high portions / calories
    2. Sudden calorie or protein drops vs school mean
    3. Repeated identical values (potential duplicate photo submission)
    4. Unusual meal patterns
    Displays: 'Anomaly detected. Review recommended.'
    """
    q = (
        db.query(Meal)
        .join(NutritionRecord, NutritionRecord.meal_id == Meal.id)
        .filter(Meal.status.in_(["ADEQUATE", "POTENTIAL_SHORTFALL", "SIGNIFICANT_SHORTFALL"]))
        .order_by(Meal.meal_date.asc(), Meal.id.asc())
    )
    if not include_demo:
        q = q.filter(Meal.is_demo == False)

    meals = q.all()
    if not meals:
        return []

    anomalies: List[Dict[str, Any]] = []

    # Feature matrix for Scikit-learn IsolationForest when >= 5 meals exist
    features = []
    for m in meals:
        nr = m.nutrition_record
        total_grams = sum(d.estimated_grams_likely for d in m.detections) if m.detections else 0.0
        features.append([
            float(nr.total_calories_likely),
            float(nr.total_protein_likely),
            float(total_grams),
        ])

    iso_flags = [False] * len(meals)
    if len(meals) >= 6:
        X = np.array(features, dtype=np.float64)
        clf = IsolationForest(contamination=0.18, random_state=42)
        preds = clf.fit_predict(X)
        iso_flags = [bool(p == -1) for p in preds]

    # Group by school for sudden drop and identical-value checks
    by_school: Dict[int, List[Meal]] = {}
    for m in meals:
        by_school.setdefault(m.school_id, []).append(m)

    for idx, meal in enumerate(meals):
        nr = meal.nutrition_record
        school_meals = by_school.get(meal.school_id, [])
        school_cals = [sm.nutrition_record.total_calories_likely for sm in school_meals if sm.nutrition_record]
        mean_cal = float(np.mean(school_cals)) if school_cals else nr.target_calories

        total_grams = sum(d.estimated_grams_likely for d in meal.detections) if meal.detections else 0.0
        reasons = []

        # 1. Unusually low or high total portion/calories
        if nr.total_calories_likely < nr.target_calories * 0.65:
            reasons.append(
                f"Unusually low calorie estimate ({nr.total_calories_likely:.0f} kcal vs {nr.target_calories:.0f} kcal norm)"
            )
        elif nr.total_calories_likely > nr.target_calories * 1.45 or total_grams > 750.0:
            reasons.append(
                f"Unusually high portion/calorie estimate ({total_grams:.0f} g, {nr.total_calories_likely:.0f} kcal)"
            )

        # 2. Sudden drop from school baseline (>25% below school average)
        if len(school_cals) >= 3 and nr.total_calories_likely < mean_cal * 0.74:
            reasons.append(
                f"Sudden calorie drop ({nr.total_calories_likely:.0f} kcal vs school average {mean_cal:.0f} kcal)"
            )

        # 3. Repeated identical values across consecutive submissions in the same school
        pos_in_school = school_meals.index(meal)
        if pos_in_school > 0:
            prev_meal = school_meals[pos_in_school - 1]
            if (
                prev_meal.nutrition_record
                and abs(prev_meal.nutrition_record.total_calories_likely - nr.total_calories_likely) < 0.2
                and abs(prev_meal.nutrition_record.total_protein_likely - nr.total_protein_likely) < 0.05
            ):
                reasons.append(
                    f"Repeated identical nutrition values across consecutive submissions (Meal #{prev_meal.id} & #{meal.id})"
                )

        # 4. IsolationForest multivariate outlier
        if iso_flags[idx] and not reasons:
            reasons.append("Multivariate calorie/protein/portion outlier identified by statistical IsolationForest")

        if reasons:
            anomalies.append({
                "meal_id": meal.id,
                "school_id": meal.school_id,
                "school_name": meal.school.name if meal.school else f"School #{meal.school_id}",
                "meal_date": meal.meal_date,
                "meal_type": meal.meal_type,
                "calories_likely": round(nr.total_calories_likely, 1),
                "protein_likely": round(nr.total_protein_likely, 1),
                "total_grams_likely": round(total_grams, 1),
                "status": meal.status,
                "confidence_tier": meal.overall_confidence_tier,
                "anomaly_reasons": reasons,
                "banner_message": "Anomaly detected. Review recommended.",
            })

    anomalies.sort(key=lambda a: a["meal_date"], reverse=True)
    return anomalies
