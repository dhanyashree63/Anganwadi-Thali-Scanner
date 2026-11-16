"""
Seeds realistic, clearly labeled demo and initial operational data into PostgreSQL:
- Default users for all 3 roles (ADMIN, OFFICER, STAFF) with hashed passwords
- Configurable nutritional norms (PM POSHAN Primary, Upper Primary, ICDS Anganwadi)
- Foods from `data/nutrition/foods_seed.csv` (explicitly marked `verified = false` until admin review)
- Default recipes with raw ingredient weights and yield factors (Sambar, Vegetable Curry, Dal)
- Standardized 5-Compartment Tray Configuration (`data/tray/tray_config.json`)
- Multiple schools & Anganwadi centres across districts/blocks
- Realistic demo & historical meals:
  * Adequate meals
  * Potential shortfall (including range-straddles-threshold example)
  * Significant shortfall (with auto-created verification tasks)
  * Low-confidence detections
  * Verified & manually corrected meals with full audit trail
  * Repeated shortfalls & persistent shortfall patterns for officer monitoring
  * Initial collected dataset samples & calibration models
"""
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from sqlalchemy.orm import Session

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import (
    AuditLog,
    CalibrationModel,
    DatasetSample,
    FoodDetection,
    FoodItem,
    ImageQualityCheck,
    Meal,
    MealImage,
    NutritionNorm,
    NutritionRecord,
    Recipe,
    RecipeIngredient,
    School,
    TrayConfig,
    User,
    VerificationRecord,
)
from app.auth import hash_password
from app.nutrition import seed_foods_from_csv


def seed_all_data(db: Session) -> dict:
    Base.metadata.create_all(bind=engine)

    # 1. Seed Foods from CSV (`verified = false`)
    seed_foods_from_csv(db)

    # 2. Seed Tray Config
    if db.query(TrayConfig).count() == 0 and settings.TRAY_CONFIG_PATH.exists():
        with open(settings.TRAY_CONFIG_PATH, "r", encoding="utf-8") as f:
            t_cfg = json.load(f)
        db.add(
            TrayConfig(
                tray_name=t_cfg["tray_name"],
                version=t_cfg["version"],
                tray_width_cm=float(t_cfg["tray_width_cm"]),
                tray_height_cm=float(t_cfg["tray_height_cm"]),
                marker_config=t_cfg["marker"],
                compartments_config=t_cfg["compartments"],
                default_meal_mapping=t_cfg["default_meal_mapping"],
                is_active=True,
            )
        )
        db.commit()

    # 3. Seed Configurable Nutritional Norms
    if db.query(NutritionNorm).count() == 0:
        norms = [
            NutritionNorm(
                scheme="PM POSHAN",
                age_group="6-10 years (Primary)",
                meal_type="LUNCH",
                calorie_target=450.0,
                protein_target=12.0,
                tolerance_pct=10.0,
                severe_shortfall_pct=22.0,
                description="PM POSHAN Primary School Hot Cooked Mid-Day Meal Norm (450 kcal, 12g protein)",
            ),
            NutritionNorm(
                scheme="PM POSHAN",
                age_group="11-14 years (Upper Primary)",
                meal_type="LUNCH",
                calorie_target=700.0,
                protein_target=20.0,
                tolerance_pct=10.0,
                severe_shortfall_pct=22.0,
                description="PM POSHAN Upper Primary Hot Cooked Mid-Day Meal Norm (700 kcal, 20g protein)",
            ),
            NutritionNorm(
                scheme="ICDS Anganwadi",
                age_group="3-6 years (Anganwadi)",
                meal_type="LUNCH",
                calorie_target=350.0,
                protein_target=10.0,
                tolerance_pct=10.0,
                severe_shortfall_pct=22.0,
                description="ICDS Anganwadi Morning/Noon Hot Meal Norm (350 kcal, 10g protein)",
            ),
            NutritionNorm(
                scheme="ICDS Anganwadi",
                age_group="3-6 years (Anganwadi)",
                meal_type="BREAKFAST",
                calorie_target=250.0,
                protein_target=7.5,
                tolerance_pct=10.0,
                severe_shortfall_pct=22.0,
                description="ICDS Anganwadi Morning Breakfast Norm (250 kcal, 7.5g protein)",
            ),
        ]
        db.add_all(norms)
        db.commit()

    # 4. Seed Schools and Anganwadi Centres
    if db.query(School).count() == 0:
        schools = [
            School(
                code="SCH-BLR-101",
                name="Govt Model Primary School, Malleswaram",
                center_type="PRIMARY_SCHOOL",
                district="Bengaluru Urban",
                block="North Block-1",
                scheme="PM POSHAN",
                default_age_group="6-10 years (Primary)",
                enrolled_children=145,
            ),
            School(
                code="SCH-BLR-102",
                name="Govt Higher Primary School, Yelahanka",
                center_type="UPPER_PRIMARY",
                district="Bengaluru Urban",
                block="North Block-2",
                scheme="PM POSHAN",
                default_age_group="11-14 years (Upper Primary)",
                enrolled_children=210,
            ),
            School(
                code="AWC-MYS-201",
                name="Anganwadi Centre #42, Hunsur",
                center_type="ANGANWADI",
                district="Mysuru",
                block="Hunsur Rural",
                scheme="ICDS Anganwadi",
                default_age_group="3-6 years (Anganwadi)",
                enrolled_children=58,
            ),
            School(
                code="SCH-DWD-301",
                name="Govt Primary School, Navalgund",
                center_type="PRIMARY_SCHOOL",
                district="Dharwad",
                block="Navalgund",
                scheme="PM POSHAN",
                default_age_group="6-10 years (Primary)",
                enrolled_children=112,
            ),
        ]
        db.add_all(schools)
        db.commit()

    all_schools = db.query(School).order_by(School.id.asc()).all()
    primary_school = all_schools[0]

    # 5. Seed Default Users (ADMIN, OFFICER, STAFF)
    if db.query(User).count() == 0:
        users = [
            User(
                email="admin@thalicheck.gov.in",
                full_name="Dr. Kavitha Rao (State System Admin)",
                hashed_password=hash_password("Admin@123"),
                role="ADMIN",
                school_id=None,
            ),
            User(
                email="officer@thalicheck.gov.in",
                full_name="Rajeshwar Gowda (District Nutrition Officer)",
                hashed_password=hash_password("Officer@123"),
                role="OFFICER",
                school_id=None,
            ),
            User(
                email="staff@thalicheck.gov.in",
                full_name="Meenakshi Devi (Mid-Day Meal Coordinator)",
                hashed_password=hash_password("Staff@123"),
                role="STAFF",
                school_id=primary_school.id,
            ),
        ]
        db.add_all(users)
        db.commit()

    staff_user = db.query(User).filter(User.role == "STAFF").first()
    officer_user = db.query(User).filter(User.role == "OFFICER").first()
    admin_user = db.query(User).filter(User.role == "ADMIN").first()

    # 6. Seed Default Recipes (Sambar & Vegetable Curry)
    all_foods = {f.code: f for f in db.query(FoodItem).all()}
    if db.query(Recipe).count() == 0 and "sambar" in all_foods and "vegetable_curry" in all_foods:
        sambar_recipe = Recipe(
            food_item_id=all_foods["sambar"].id,
            school_id=None,
            name="Standard Karnataka School Toor Dal & Drumstick Sambar",
            cooking_yield_factor=2.4,
            serving_size_g=140.0,
            notes="Default state kitchen formulation; unverified until school ration audit.",
            verified=False,
        )
        db.add(sambar_recipe)
        db.flush()
        db.add_all([
            RecipeIngredient(
                recipe_id=sambar_recipe.id,
                ingredient_name="Raw Toor Dal (Red Gram)",
                raw_weight_g=30.0,
                calories_per_100g=335.0,
                protein_per_100g=22.3,
                carbs_per_100g=57.2,
            ),
            RecipeIngredient(
                recipe_id=sambar_recipe.id,
                ingredient_name="Mixed Vegetables (Drumstick, Carrot, Tomato, Onion)",
                raw_weight_g=40.0,
                calories_per_100g=36.0,
                protein_per_100g=1.6,
                carbs_per_100g=7.2,
            ),
            RecipeIngredient(
                recipe_id=sambar_recipe.id,
                ingredient_name="Groundnut / Sunflower Cooking Oil & Sambar Powder",
                raw_weight_g=4.5,
                calories_per_100g=720.0,
                protein_per_100g=3.0,
                carbs_per_100g=12.0,
            ),
        ])

        veg_recipe = Recipe(
            food_item_id=all_foods["vegetable_curry"].id,
            school_id=None,
            name="Seasonal Mixed Vegetable Palya / Curry",
            cooking_yield_factor=1.35,
            serving_size_g=100.0,
            notes="Steamed seasonal vegetables with tempering.",
            verified=False,
        )
        db.add(veg_recipe)
        db.flush()
        db.add_all([
            RecipeIngredient(
                recipe_id=veg_recipe.id,
                ingredient_name="Beans, Carrot, Potato & Cabbage",
                raw_weight_g=80.0,
                calories_per_100g=52.0,
                protein_per_100g=2.1,
                carbs_per_100g=10.5,
            ),
            RecipeIngredient(
                recipe_id=veg_recipe.id,
                ingredient_name="Roasted Gram & Coconut Tempering",
                raw_weight_g=12.0,
                calories_per_100g=440.0,
                protein_per_100g=11.0,
                carbs_per_100g=24.0,
            ),
        ])
        db.commit()

    # 7. Ensure synthetic demo tray images exist so image preview & quality check work out of the box
    try:
        from scripts.make_synthetic_smoke_dataset import make_synthetic_smoke_dataset
        if not (settings.DEMO_DIR / "demo_tray_adequate.jpg").exists():
            make_synthetic_smoke_dataset(settings.DATASET_DIR, samples_per_class=8, num_sessions=6)
    except Exception:
        pass

    # 8. Seed Calibration Models (some calibrated >=30 samples, some uncalibrated <30 samples to demonstrate flags)
    if db.query(CalibrationModel).count() == 0 and all_foods:
        for code, f_item in all_foods.items():
            if code in ("rice", "dal", "sambar"):
                db.add(
                    CalibrationModel(
                        food_item_id=f_item.id,
                        version=f"cal-{code}-n34",
                        model_type="linear_regression",
                        sample_count=34,
                        is_calibrated=True,
                        slope=1.02,
                        intercept=1.5,
                        residual_p10_g=-14.0,
                        residual_p50_g=0.0,
                        residual_p90_g=15.0,
                        mae_g=8.4,
                        mape_pct=6.8,
                        is_active=True,
                    )
                )
            else:
                db.add(
                    CalibrationModel(
                        food_item_id=f_item.id,
                        version=f"cal-{code}-n12-uncalibrated",
                        model_type="linear_regression",
                        sample_count=12,
                        is_calibrated=False,
                        slope=1.0,
                        intercept=0.0,
                        residual_p10_g=-21.0,
                        residual_p50_g=0.0,
                        residual_p90_g=21.0,
                        mae_g=13.2,
                        mape_pct=12.4,
                        is_active=True,
                    )
                )
        db.commit()

    # 9. Seed Sample Meals covering all statuses, patterns, anomalies, and verification workflows
    if db.query(Meal).count() == 0:
        norm_primary = db.query(NutritionNorm).filter(NutritionNorm.age_group == "6-10 years (Primary)").first()
        norm_upper = db.query(NutritionNorm).filter(NutritionNorm.age_group == "11-14 years (Upper Primary)").first()
        norm_awc = db.query(NutritionNorm).filter(NutritionNorm.age_group == "3-6 years (Anganwadi)").first()

        sample_meals_spec = [
            # School 1 (Malleswaram): Mostly adequate + 1 potential shortfall straddling threshold
            {
                "school": all_schools[0],
                "date": "2026-11-11",
                "meal_type": "LUNCH",
                "status": "ADEQUATE",
                "conf_tier": "MEDIUM",
                "conf_pct": 79.5,
                "cal": (448.0, 482.0, 518.0),
                "prot": (12.4, 13.8, 15.2),
                "norm": norm_primary,
                "straddles": False,
                "needs_verif": False,
                "verif_status": "NOT_REQUIRED",
                "verif_reason": None,
                "is_demo": False,
                "img": "demo_tray_adequate.jpg",
                "rice_g": (155.0, 170.0, 185.0),
                "dal_g": (115.0, 130.0, 145.0),
                "veg_g": (85.0, 100.0, 115.0),
                "chapati_g": (40.0, 48.0, 56.0),
                "curd_g": (65.0, 75.0, 85.0),
                "low_conf_item": False,
            },
            {
                "school": all_schools[0],
                "date": "2026-11-13",
                "meal_type": "LUNCH",
                "status": "POTENTIAL_SHORTFALL",
                "conf_tier": "MEDIUM",
                "conf_pct": 74.2,
                "cal": (418.0, 444.0, 472.0),
                "prot": (11.1, 12.1, 13.3),
                "norm": norm_primary,
                "straddles": True,
                "needs_verif": True,
                "verif_status": "VERIFIED",
                "verif_reason": "Estimate range overlaps calorie/protein threshold",
                "is_demo": False,
                "img": "demo_tray_potential_shortfall.jpg",
                "rice_g": (135.0, 150.0, 165.0),
                "dal_g": (95.0, 110.0, 125.0),
                "veg_g": (70.0, 85.0, 100.0),
                "chapati_g": (35.0, 42.0, 50.0),
                "curd_g": (55.0, 65.0, 75.0),
                "low_conf_item": False,
            },
            {
                "school": all_schools[0],
                "date": "2026-11-15",
                "meal_type": "LUNCH",
                "status": "ADEQUATE",
                "conf_tier": "LOW",
                "conf_pct": 58.4,
                "cal": (452.0, 476.0, 504.0),
                "prot": (12.1, 13.2, 14.4),
                "norm": norm_primary,
                "straddles": False,
                "needs_verif": True,
                "verif_status": "PENDING",
                "verif_reason": "Adequate status with low overall confidence (false-reassurance safeguard); Low-confidence food detection",
                "is_demo": False,
                "img": "demo_tray_adequate.jpg",
                "rice_g": (150.0, 165.0, 180.0),
                "dal_g": (110.0, 125.0, 140.0),
                "veg_g": (80.0, 95.0, 110.0),
                "chapati_g": (38.0, 45.0, 52.0),
                "curd_g": (60.0, 70.0, 80.0),
                "low_conf_item": True,
            },
            # School 2 (Yelahanka Upper Primary): Repeated shortfalls (2 shortfalls)
            {
                "school": all_schools[1],
                "date": "2026-11-12",
                "meal_type": "LUNCH",
                "status": "POTENTIAL_SHORTFALL",
                "conf_tier": "MEDIUM",
                "conf_pct": 76.0,
                "cal": (595.0, 635.0, 678.0),
                "prot": (16.8, 18.4, 20.2),
                "norm": norm_upper,
                "straddles": True,
                "needs_verif": True,
                "verif_status": "VERIFIED",
                "verif_reason": "Potential shortfall on Upper Primary norm",
                "is_demo": False,
                "img": "demo_tray_potential_shortfall.jpg",
                "rice_g": (185.0, 205.0, 225.0),
                "dal_g": (120.0, 138.0, 155.0),
                "veg_g": (85.0, 100.0, 115.0),
                "chapati_g": (48.0, 58.0, 68.0),
                "curd_g": (65.0, 78.0, 90.0),
                "low_conf_item": False,
            },
            {
                "school": all_schools[1],
                "date": "2026-11-14",
                "meal_type": "LUNCH",
                "status": "SIGNIFICANT_SHORTFALL",
                "conf_tier": "LOW",
                "conf_pct": 54.0,
                "cal": (460.0, 498.0, 535.0),
                "prot": (12.2, 13.8, 15.4),
                "norm": norm_upper,
                "straddles": False,
                "needs_verif": True,
                "verif_status": "PENDING",
                "verif_reason": "Significant shortfall with low confidence; Low-confidence food detection",
                "is_demo": False,
                "img": "demo_tray_significant_shortfall.jpg",
                "rice_g": (140.0, 155.0, 170.0),
                "dal_g": (85.0, 100.0, 115.0),
                "veg_g": (65.0, 78.0, 92.0),
                "chapati_g": (35.0, 42.0, 50.0),
                "curd_g": (45.0, 55.0, 65.0),
                "low_conf_item": True,
            },
            # School 3 (Anganwadi Hunsur): Adequate
            {
                "school": all_schools[2],
                "date": "2026-11-14",
                "meal_type": "LUNCH",
                "status": "ADEQUATE",
                "conf_tier": "MEDIUM",
                "conf_pct": 80.2,
                "cal": (342.0, 368.0, 395.0),
                "prot": (9.8, 10.9, 12.1),
                "norm": norm_awc,
                "straddles": False,
                "needs_verif": False,
                "verif_status": "NOT_REQUIRED",
                "verif_reason": None,
                "is_demo": False,
                "img": "demo_tray_adequate.jpg",
                "rice_g": (115.0, 128.0, 142.0),
                "dal_g": (85.0, 98.0, 112.0),
                "veg_g": (60.0, 72.0, 84.0),
                "chapati_g": (25.0, 32.0, 40.0),
                "curd_g": (50.0, 60.0, 70.0),
                "low_conf_item": False,
            },
            # School 4 (Navalgund Primary): Persistent shortfall pattern (4 consecutive shortfalls across verified meals)
            {
                "school": all_schools[3],
                "date": "2026-11-10",
                "meal_type": "LUNCH",
                "status": "POTENTIAL_SHORTFALL",
                "conf_tier": "MEDIUM",
                "conf_pct": 75.0,
                "cal": (382.0, 410.0, 438.0),
                "prot": (9.8, 10.8, 11.9),
                "norm": norm_primary,
                "straddles": False,
                "needs_verif": True,
                "verif_status": "VERIFIED",
                "verif_reason": "Potential nutritional shortfall detected",
                "is_demo": False,
                "img": "demo_tray_potential_shortfall.jpg",
                "rice_g": (125.0, 138.0, 152.0),
                "dal_g": (82.0, 95.0, 108.0),
                "veg_g": (65.0, 75.0, 85.0),
                "chapati_g": (30.0, 36.0, 42.0),
                "curd_g": (45.0, 55.0, 65.0),
                "low_conf_item": False,
            },
            {
                "school": all_schools[3],
                "date": "2026-11-11",
                "meal_type": "LUNCH",
                "status": "SIGNIFICANT_SHORTFALL",
                "conf_tier": "MEDIUM",
                "conf_pct": 73.5,
                "cal": (310.0, 338.0, 366.0),
                "prot": (7.9, 8.8, 9.8),
                "norm": norm_primary,
                "straddles": False,
                "needs_verif": True,
                "verif_status": "VERIFIED",
                "verif_reason": "Significant nutritional shortfall detected",
                "is_demo": False,
                "img": "demo_tray_significant_shortfall.jpg",
                "rice_g": (105.0, 118.0, 132.0),
                "dal_g": (65.0, 75.0, 85.0),
                "veg_g": (50.0, 60.0, 70.0),
                "chapati_g": (25.0, 30.0, 36.0),
                "curd_g": (40.0, 48.0, 56.0),
                "low_conf_item": False,
            },
            {
                "school": all_schools[3],
                "date": "2026-11-13",
                "meal_type": "LUNCH",
                "status": "SIGNIFICANT_SHORTFALL",
                "conf_tier": "LOW",
                "conf_pct": 59.0,
                "cal": (298.0, 325.0, 352.0),
                "prot": (7.5, 8.4, 9.4),
                "norm": norm_primary,
                "straddles": False,
                "needs_verif": True,
                "verif_status": "CORRECTED",
                "verif_reason": "Significant shortfall with low confidence",
                "is_demo": False,
                "img": "demo_tray_significant_shortfall.jpg",
                "rice_g": (100.0, 112.0, 125.0),
                "dal_g": (60.0, 70.0, 80.0),
                "veg_g": (48.0, 58.0, 68.0),
                "chapati_g": (24.0, 28.0, 34.0),
                "curd_g": (38.0, 45.0, 52.0),
                "low_conf_item": True,
            },
            {
                "school": all_schools[3],
                "date": "2026-11-15",
                "meal_type": "LUNCH",
                "status": "SIGNIFICANT_SHORTFALL",
                "conf_tier": "LOW",
                "conf_pct": 56.5,
                "cal": (285.0, 312.0, 340.0),
                "prot": (7.1, 8.0, 9.0),
                "norm": norm_primary,
                "straddles": False,
                "needs_verif": True,
                "verif_status": "PENDING",
                "verif_reason": "Significant shortfall with low confidence",
                "is_demo": False,
                "img": "demo_tray_significant_shortfall.jpg",
                "rice_g": (95.0, 108.0, 120.0),
                "dal_g": (58.0, 68.0, 78.0),
                "veg_g": (45.0, 55.0, 65.0),
                "chapati_g": (22.0, 26.0, 32.0),
                "curd_g": (35.0, 42.0, 50.0),
                "low_conf_item": True,
            },
            # Demo mode explicit meal (`is_demo = True`) excluded from officer statistics by default
            {
                "school": all_schools[0],
                "date": "2026-11-15",
                "meal_type": "LUNCH",
                "status": "POTENTIAL_SHORTFALL",
                "conf_tier": "MEDIUM",
                "conf_pct": 72.0,
                "cal": (412.0, 439.0, 466.0),
                "prot": (10.8, 11.7, 12.6),
                "norm": norm_primary,
                "straddles": True,
                "needs_verif": True,
                "verif_status": "PENDING",
                "verif_reason": "Demo sample: estimate range overlaps threshold",
                "is_demo": True,
                "img": "demo_tray_potential_shortfall.jpg",
                "rice_g": (132.0, 146.0, 160.0),
                "dal_g": (92.0, 106.0, 120.0),
                "veg_g": (68.0, 82.0, 96.0),
                "chapati_g": (34.0, 40.0, 46.0),
                "curd_g": (52.0, 62.0, 72.0),
                "low_conf_item": False,
            },
        ]

        for spec in sample_meals_spec:
            norm_obj = spec["norm"]
            target_cal = norm_obj.calorie_target if norm_obj else 450.0
            target_prot = norm_obj.protein_target if norm_obj else 12.0

            expl = (
                "Estimated meal nutrition appears to meet the configured calorie and protein norms within range."
                if spec["status"] == "ADEQUATE"
                else (
                    "Potential nutritional shortfall detected: estimate range overlaps threshold. Human verification recommended."
                    if spec["straddles"]
                    else "Potential nutritional shortfall detected. Human verification recommended."
                )
            )

            meal = Meal(
                school_id=spec["school"].id,
                submitted_by=staff_user.id if staff_user else None,
                meal_date=spec["date"],
                meal_type=spec["meal_type"],
                scheme=spec["school"].scheme,
                age_group=spec["school"].default_age_group,
                children_served=int(spec["school"].enrolled_children * 0.85),
                notes="Seeded monitoring record" if not spec["is_demo"] else "DEMO MODE simulated tray capture",
                status=spec["status"],
                status_explanation=expl,
                overall_confidence_tier=spec["conf_tier"],
                overall_confidence_pct=spec["conf_pct"],
                confidence_breakdown={
                    "classification_tier": "LOW" if spec["low_conf_item"] else "HIGH",
                    "image_quality_tier": "HIGH",
                    "portion_calibration_tier": "MEDIUM",
                    "nutrition_data_tier": "MEDIUM",
                    "all_portions_calibrated": False,
                    "all_nutrition_verified": False,
                },
                requires_verification=spec["needs_verif"],
                verification_status=spec["verif_status"],
                verification_reason=spec["verif_reason"],
                is_demo=spec["is_demo"],
                model_state="DEMO_MODE" if spec["is_demo"] else "SMOKE_TEST_MODEL",
                model_version_tag="demo-simulated-v1",
                analyzed_at=datetime.now(timezone.utc),
            )
            db.add(meal)
            db.flush()

            img_path = settings.DEMO_DIR / spec["img"]
            db.add(
                MealImage(
                    meal_id=meal.id,
                    file_path=str(img_path),
                    original_filename=spec["img"],
                    width_px=640,
                    height_px=480,
                    marker_detected=True,
                    px_per_cm=20.0,
                    marker_bbox=[34, 28, 94, 88],
                    rotation_deg=1.2,
                )
            )
            db.add(
                ImageQualityCheck(
                    meal_id=meal.id,
                    image_path=str(img_path),
                    passed=True,
                    quality_score=0.89,
                    blur_variance=142.5,
                    brightness_mean=148.0,
                    marker_visible=True,
                    tray_coverage_ratio=0.78,
                    tilt_degrees=1.2,
                    issues=[],
                    retake_guidance="Image quality sufficient for analysis.",
                )
            )

            # Add compartment detections
            comp_items = [
                ("comp_1", "Top-Left Bowl (Dal / Sambar)", "dal", "Dal", spec["dal_g"], True, 34, 0.88),
                ("comp_2", "Top-Center Bowl (Vegetable Curry)", "vegetable_curry", "Vegetable Curry", spec["veg_g"], False, 12, 0.56 if spec["low_conf_item"] else 0.81),
                ("comp_3", "Top-Right Bowl (Curd / Side / Egg)", "curd", "Curd", spec["curd_g"], False, 12, 0.84),
                ("comp_4", "Bottom-Left Main Well (Rice / Staple)", "rice", "Rice", spec["rice_g"], True, 34, 0.91),
                ("comp_5", "Bottom-Right Flat Well (Chapati / Fruit / Salad)", "chapati", "Chapati", spec["chapati_g"], False, 12, 0.58 if spec["low_conf_item"] else 0.83),
            ]
            for cid, cname, fcode, fname, g_tuple, is_cal, scount, c_conf in comp_items:
                f_obj = all_foods.get(fcode)
                cal_100 = f_obj.calories_per_100g if f_obj and f_obj.calories_per_100g else 110.0
                prot_100 = f_obj.protein_per_100g if f_obj and f_obj.protein_per_100g else 3.5
                glow, glikely, ghigh = g_tuple
                db.add(
                    FoodDetection(
                        meal_id=meal.id,
                        compartment_id=cid,
                        compartment_name=cname,
                        food_item_id=f_obj.id if f_obj else None,
                        detected_food_name=fname,
                        raw_confidence=min(0.98, c_conf + 0.03),
                        calibrated_confidence=c_conf,
                        is_low_confidence=(c_conf < settings.LOW_CONFIDENCE_THRESHOLD),
                        fill_fraction=round(min(0.92, glikely / 190.0), 2),
                        geometric_grams=round(glikely * 0.97, 1),
                        estimated_grams_low=glow,
                        estimated_grams_likely=glikely,
                        estimated_grams_high=ghigh,
                        is_portion_calibrated=is_cal,
                        calibration_sample_count=scount,
                        calories_low=round(glow * cal_100 / 100.0, 1),
                        calories_likely=round(glikely * cal_100 / 100.0, 1),
                        calories_high=round(ghigh * cal_100 / 100.0, 1),
                        protein_low=round(glow * prot_100 / 100.0, 2),
                        protein_likely=round(glikely * prot_100 / 100.0, 2),
                        protein_high=round(ghigh * prot_100 / 100.0, 2),
                        nutrition_verified=False,
                        nutrition_missing=False,
                        nutrition_source=f_obj.source if f_obj else "IFCT 2017",
                        manually_corrected=(spec["verif_status"] == "CORRECTED" and cid == "comp_4"),
                    )
                )

            clow, clikely, chigh = spec["cal"]
            plow, plikely, phigh = spec["prot"]
            db.add(
                NutritionRecord(
                    meal_id=meal.id,
                    norm_id=norm_obj.id if norm_obj else None,
                    total_calories_low=clow,
                    total_calories_likely=clikely,
                    total_calories_high=chigh,
                    total_protein_low=plow,
                    total_protein_likely=plikely,
                    total_protein_high=phigh,
                    target_calories=target_cal,
                    target_protein=target_prot,
                    tolerance_pct=10.0,
                    calorie_gap_likely=round(clikely - target_cal, 1),
                    protein_gap_likely=round(plikely - target_prot, 2),
                    range_straddles_threshold=spec["straddles"],
                    has_unverified_nutrition=True,
                    has_missing_nutrition=False,
                    has_uncalibrated_portions=True,
                    excluded_items=[],
                    ai_explanation=expl,
                )
            )

            if spec["verif_status"] in ("VERIFIED", "CORRECTED"):
                db.add(
                    VerificationRecord(
                        meal_id=meal.id,
                        officer_id=officer_user.id if officer_user else None,
                        action="CORRECT_PORTION" if spec["verif_status"] == "CORRECTED" else "VERIFY",
                        previous_value={"Rice_grams": 150.0} if spec["verif_status"] == "CORRECTED" else {"status": spec["status"]},
                        new_value={"Rice_grams": 112.0} if spec["verif_status"] == "CORRECTED" else {"status": spec["status"], "verified": True},
                        reason="Verified against kitchen serving register" if spec["verif_status"] == "VERIFIED" else "Verified manually via kitchen scale check",
                        notes="Field verification completed by District Nutrition Officer.",
                    )
                )

        db.commit()

    # 10. Seed Audit Logs
    if db.query(AuditLog).count() == 0:
        db.add_all([
            AuditLog(
                user_id=admin_user.id if admin_user else None,
                user_email=admin_user.email if admin_user else "admin@thalicheck.gov.in",
                user_role="ADMIN",
                entity_type="FoodDatabase",
                entity_id="seed_csv",
                action="SEED_FOODS_UNVERIFIED",
                previous_value=None,
                new_value={"seeded_items": 11, "verified": False},
                reason="Seeded initial food composition table from data/nutrition/foods_seed.csv (marked unverified until IFCT 2017 check).",
            ),
            AuditLog(
                user_id=officer_user.id if officer_user else None,
                user_email=officer_user.email if officer_user else "officer@thalicheck.gov.in",
                user_role="OFFICER",
                entity_type="MealDetection",
                entity_id="9",
                action="CORRECT_PORTION",
                previous_value={"food": "Rice", "estimated_grams_likely": 150.0},
                new_value={"food": "Rice", "estimated_grams_likely": 112.0},
                reason="Officer corrected Rice portion. Previous: 150 g. Updated: 112 g. Reason: Verified manually.",
            ),
        ])
        db.commit()

    # 11. Seed Dataset Samples in PostgreSQL from labels.csv if present
    if db.query(DatasetSample).count() == 0:
        labels_csv = settings.DATASET_DIR / "labels.csv"
        if labels_csv.exists():
            import csv as _csv
            with open(labels_csv, "r", encoding="utf-8") as f:
                for row in _csv.DictReader(f):
                    w_g = float(row.get("weighed_grams", 0.0) or 0.0)
                    db.add(
                        DatasetSample(
                            image_path=row["image_path"],
                            compartment_id=row.get("compartment_id", "comp_4"),
                            food_class=row["food_class"],
                            weighed_grams=w_g,
                            geometric_estimate_g=round(w_g * 0.96, 1) if w_g > 0 else 0.0,
                            session_id=row.get("session_id", "sess_01"),
                            lighting_condition=row.get("lighting_note", "Indoor Natural"),
                            device_model="Smoke/Demo Generator",
                            photographer=row.get("photographer", "staff@thalicheck.gov.in"),
                            split=None,
                            status="APPROVED",
                            quality_passed=True,
                        )
                    )
            db.commit()

    return {
        "schools": db.query(School).count(),
        "users": db.query(User).count(),
        "foods": db.query(FoodItem).count(),
        "meals": db.query(Meal).count(),
        "norms": db.query(NutritionNorm).count(),
    }


if __name__ == "__main__":
    db_sess = SessionLocal()
    try:
        summary = seed_all_data(db_sess)
        print("Seeded ThaliCheck database:", json.dumps(summary, indent=2))
    finally:
        db_sess.close()
