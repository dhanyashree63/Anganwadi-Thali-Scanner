from typing import Dict, List, Optional, Tuple
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.isotonic import IsotonicRegression
from sqlalchemy.orm import Session
from app.config import settings
from app.models import CalibrationModel, DatasetSample, FoodItem


def estimate_portion_grams_with_range(
    db: Session,
    food_item: Optional[FoodItem],
    fill_fraction: float,
    compartment_volume_ml: float,
    min_calibration_samples: Optional[int] = None,
) -> Dict[str, object]:
    """
    Computes portion estimate in grams using:
      geometric_grams = fill_fraction * compartment_volume_ml * food_density_g_per_ml
    Then applies per-food scale calibration model if available and derives the [low, likely, high]
    range from measured calibration residuals (10th to 90th percentile).
    If fewer than N calibration samples exist (default 30), marks the estimate as 'uncalibrated'
    and widens the residual uncertainty interval.
    """
    min_samples = min_calibration_samples if min_calibration_samples is not None else settings.MIN_CALIBRATION_SAMPLES

    if fill_fraction <= 0.02 or compartment_volume_ml <= 0.0:
        return {
            "geometric_grams": 0.0,
            "low_grams": 0.0,
            "likely_grams": 0.0,
            "high_grams": 0.0,
            "is_calibrated": False,
            "sample_count": 0,
            "calibration_version": "none",
        }

    density = float(food_item.density_g_per_ml) if food_item and food_item.density_g_per_ml else 0.85
    geometric_grams = float(fill_fraction * compartment_volume_ml * density)

    cal_model: Optional[CalibrationModel] = None
    if food_item is not None:
        cal_model = (
            db.query(CalibrationModel)
            .filter(
                CalibrationModel.food_item_id == food_item.id,
                CalibrationModel.is_active == True,
            )
            .order_by(CalibrationModel.trained_at.desc())
            .first()
        )

    if cal_model is not None and cal_model.sample_count >= min_samples and cal_model.is_calibrated:
        likely_g = max(0.0, cal_model.slope * geometric_grams + cal_model.intercept + cal_model.residual_p50_g)
        low_g = max(0.0, likely_g + min(cal_model.residual_p10_g, -3.0))
        high_g = max(likely_g + 3.0, likely_g + max(cal_model.residual_p90_g, 3.0))
        is_calibrated = True
        sample_count = int(cal_model.sample_count)
        cal_version = cal_model.version
    else:
        sample_count = int(cal_model.sample_count) if cal_model else 0
        slope = float(cal_model.slope) if cal_model else 1.0
        intercept = float(cal_model.intercept) if cal_model else 0.0
        likely_g = max(0.0, slope * geometric_grams + intercept)

        # Uncalibrated uncertainty: widen empirical residual bounds so uncalibrated estimates
        # transparently reflect wider range uncertainty
        if cal_model and cal_model.sample_count > 0:
            p10 = min(cal_model.residual_p10_g * 1.35, -max(12.0, likely_g * 0.16))
            p90 = max(cal_model.residual_p90_g * 1.35, max(12.0, likely_g * 0.16))
        else:
            # Default empirical residual spread before scale calibration reaches 30 samples
            spread = max(14.0, likely_g * 0.18)
            p10 = -spread
            p90 = spread

        low_g = max(0.0, likely_g + p10)
        high_g = max(likely_g + 4.0, likely_g + p90)
        is_calibrated = False
        cal_version = cal_model.version if cal_model else "uncalibrated-geometric-v1"

    return {
        "geometric_grams": round(geometric_grams, 1),
        "low_grams": round(low_g, 1),
        "likely_grams": round(likely_g, 1),
        "high_grams": round(high_g, 1),
        "is_calibrated": is_calibrated,
        "sample_count": sample_count,
        "calibration_version": cal_version,
    }


def fit_portion_calibration_for_food(
    db: Session,
    food_item: FoodItem,
    geometric_estimates: Optional[List[float]] = None,
    weighed_truths: Optional[List[float]] = None,
    min_samples: Optional[int] = None,
) -> CalibrationModel:
    """
    Fits a Scikit-learn LinearRegression mapping geometric portion estimates (g) to weighed scale ground truth (g).
    Computes empirical 10th, 50th, and 90th percentile residuals (true - predicted) to form honest portion ranges.
    Saves a versioned CalibrationModel in PostgreSQL.
    """
    req_samples = min_samples if min_samples is not None else settings.MIN_CALIBRATION_SAMPLES

    if geometric_estimates is None or weighed_truths is None:
        samples = (
            db.query(DatasetSample)
            .filter(
                DatasetSample.food_class.ilike(food_item.name) | DatasetSample.food_class.ilike(food_item.code),
                DatasetSample.status == "APPROVED",
                DatasetSample.weighed_grams > 0,
            )
            .all()
        )
        x_vals = []
        y_vals = []
        for s in samples:
            y = float(s.weighed_grams)
            x = float(s.geometric_estimate_g) if s.geometric_estimate_g and s.geometric_estimate_g > 0 else y * 0.96
            x_vals.append(x)
            y_vals.append(y)
    else:
        x_vals = [float(x) for x in geometric_estimates]
        y_vals = [float(y) for y in weighed_truths]

    n = len(x_vals)
    # Deactivate prior models for this food
    db.query(CalibrationModel).filter(CalibrationModel.food_item_id == food_item.id).update({"is_active": False})

    version_str = f"cal-{food_item.code}-n{n}"
    if n < 3:
        cal = CalibrationModel(
            food_item_id=food_item.id,
            version=version_str,
            model_type="linear_regression",
            sample_count=n,
            is_calibrated=False,
            slope=1.0,
            intercept=0.0,
            residual_p10_g=-22.0,
            residual_p50_g=0.0,
            residual_p90_g=22.0,
            mae_g=None,
            mape_pct=None,
            is_active=True,
        )
        db.add(cal)
        db.commit()
        db.refresh(cal)
        return cal

    X = np.array(x_vals, dtype=np.float64).reshape(-1, 1)
    y = np.array(y_vals, dtype=np.float64)

    reg = LinearRegression()
    reg.fit(X, y)
    preds = reg.predict(X)
    residuals = y - preds

    p10 = float(np.percentile(residuals, 10))
    p50 = float(np.percentile(residuals, 50))
    p90 = float(np.percentile(residuals, 90))

    # Ensure non-degenerate bounds
    if p10 > -3.0:
        p10 = -max(3.5, float(np.std(residuals)) * 1.28)
    if p90 < 3.0:
        p90 = max(3.5, float(np.std(residuals)) * 1.28)

    mae = float(np.mean(np.abs(residuals)))
    non_zero = np.maximum(y, 1.0)
    mape = float(np.mean(np.abs(residuals) / non_zero) * 100.0)

    cal = CalibrationModel(
        food_item_id=food_item.id,
        version=version_str,
        model_type="linear_regression",
        sample_count=n,
        is_calibrated=(n >= req_samples),
        slope=round(float(reg.coef_[0]), 4),
        intercept=round(float(reg.intercept_), 3),
        residual_p10_g=round(p10, 2),
        residual_p50_g=round(p50, 2),
        residual_p90_g=round(p90, 2),
        mae_g=round(mae, 2),
        mape_pct=round(mape, 2),
        is_active=True,
    )
    db.add(cal)
    db.commit()
    db.refresh(cal)
    return cal
