from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="STAFF")  # ADMIN, OFFICER, STAFF
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    school = relationship("School", back_populates="staff_members")
    meals_submitted = relationship("Meal", back_populates="submitted_by_user")


class School(Base):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    center_type = Column(String(64), nullable=False, default="PRIMARY_SCHOOL")  # PRIMARY_SCHOOL, UPPER_PRIMARY, ANGANWADI
    district = Column(String(128), nullable=False)
    block = Column(String(128), nullable=False)
    scheme = Column(String(128), nullable=False, default="PM POSHAN")
    default_age_group = Column(String(64), nullable=False, default="6-10 years (Primary)")
    enrolled_children = Column(Integer, default=120, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    staff_members = relationship("User", back_populates="school")
    meals = relationship("Meal", back_populates="school")
    recipes = relationship("Recipe", back_populates="school")


class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), unique=True, nullable=False)
    category = Column(String(128), nullable=False, default="General")
    calories_per_100g = Column(Float, nullable=True)  # Nullable to allow missing nutrition value handling
    protein_per_100g = Column(Float, nullable=True)
    carbs_per_100g = Column(Float, nullable=True)
    fat_per_100g = Column(Float, nullable=True, default=0.0)
    fiber_per_100g = Column(Float, nullable=True, default=0.0)
    density_g_per_ml = Column(Float, nullable=False, default=0.85)
    source = Column(String(128), nullable=False, default="IFCT 2017")
    source_reference = Column(String(255), nullable=True)
    verified = Column(Boolean, default=False, nullable=False)
    last_reviewed = Column(DateTime(timezone=True), nullable=True)
    is_recipe_based = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    detections = relationship("FoodDetection", back_populates="food_item")
    calibration_models = relationship("CalibrationModel", back_populates="food_item")
    recipes = relationship("Recipe", back_populates="food_item")


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=False)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True)  # Null = default recipe across schools
    name = Column(String(255), nullable=False)
    cooking_yield_factor = Column(Float, nullable=False, default=2.2)  # Cooked weight / Raw weight ratio
    serving_size_g = Column(Float, nullable=False, default=150.0)
    notes = Column(Text, nullable=True)
    verified = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    food_item = relationship("FoodItem", back_populates="recipes")
    school = relationship("School", back_populates="recipes")
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    ingredient_name = Column(String(128), nullable=False)
    raw_weight_g = Column(Float, nullable=False)
    calories_per_100g = Column(Float, nullable=False)
    protein_per_100g = Column(Float, nullable=False)
    carbs_per_100g = Column(Float, nullable=False, default=0.0)

    recipe = relationship("Recipe", back_populates="ingredients")


class NutritionNorm(Base):
    __tablename__ = "nutrition_norms"

    id = Column(Integer, primary_key=True, index=True)
    scheme = Column(String(128), nullable=False, default="PM POSHAN")
    age_group = Column(String(128), nullable=False)  # e.g., "6-10 years (Primary)", "11-14 years (Upper Primary)", "3-6 years (Anganwadi)"
    meal_type = Column(String(64), nullable=False, default="LUNCH")  # BREAKFAST, LUNCH, SNACK
    calorie_target = Column(Float, nullable=False)
    protein_target = Column(Float, nullable=False)
    tolerance_pct = Column(Float, nullable=False, default=10.0)  # e.g. within 10% below target = POTENTIAL SHORTFALL, lower = SIGNIFICANT SHORTFALL
    severe_shortfall_pct = Column(Float, nullable=False, default=22.0)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class TrayConfig(Base):
    __tablename__ = "tray_configs"

    id = Column(Integer, primary_key=True, index=True)
    tray_name = Column(String(255), nullable=False)
    version = Column(String(64), nullable=False, default="1.0.0")
    tray_width_cm = Column(Float, nullable=False, default=32.0)
    tray_height_cm = Column(Float, nullable=False, default=24.0)
    marker_config = Column(JSON, nullable=False)
    compartments_config = Column(JSON, nullable=False)
    default_meal_mapping = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False, index=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    meal_date = Column(String(32), nullable=False, index=True)  # YYYY-MM-DD
    meal_type = Column(String(64), nullable=False, default="LUNCH")  # BREAKFAST, LUNCH, SNACK
    scheme = Column(String(128), nullable=False, default="PM POSHAN")
    age_group = Column(String(128), nullable=False, default="6-10 years (Primary)")
    children_served = Column(Integer, nullable=False, default=85)
    notes = Column(Text, nullable=True)

    status = Column(String(64), nullable=False, default="PENDING_ANALYSIS")
    # Status values: PENDING_ANALYSIS, QUALITY_REJECTED, ADEQUATE, POTENTIAL_SHORTFALL, SIGNIFICANT_SHORTFALL
    status_explanation = Column(Text, nullable=True)
    overall_confidence_tier = Column(String(32), nullable=True)  # HIGH, MEDIUM, LOW
    overall_confidence_pct = Column(Float, nullable=True)
    confidence_breakdown = Column(JSON, nullable=True)

    requires_verification = Column(Boolean, default=False, nullable=False)
    verification_status = Column(String(64), default="NOT_REQUIRED", nullable=False)
    # NOT_REQUIRED, PENDING, VERIFIED, CORRECTED, REJECTED
    verification_reason = Column(String(255), nullable=True)

    is_demo = Column(Boolean, default=False, nullable=False)
    model_state = Column(String(64), default="DEMO_MODE", nullable=False)  # DEMO_MODE, SMOKE_TEST_MODEL, REAL_MODEL
    model_version_tag = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    analyzed_at = Column(DateTime(timezone=True), nullable=True)

    school = relationship("School", back_populates="meals")
    submitted_by_user = relationship("User", back_populates="meals_submitted")
    images = relationship("MealImage", back_populates="meal", cascade="all, delete-orphan")
    quality_checks = relationship("ImageQualityCheck", back_populates="meal", cascade="all, delete-orphan")
    detections = relationship("FoodDetection", back_populates="meal", cascade="all, delete-orphan")
    nutrition_record = relationship("NutritionRecord", back_populates="meal", uselist=False, cascade="all, delete-orphan")
    verification_records = relationship("VerificationRecord", back_populates="meal", cascade="all, delete-orphan")


class MealImage(Base):
    __tablename__ = "meal_images"

    id = Column(Integer, primary_key=True, index=True)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False)
    file_path = Column(String(512), nullable=False)
    original_filename = Column(String(255), nullable=False)
    width_px = Column(Integer, nullable=False)
    height_px = Column(Integer, nullable=False)
    marker_detected = Column(Boolean, default=False, nullable=False)
    px_per_cm = Column(Float, nullable=True)
    marker_bbox = Column(JSON, nullable=True)
    rotation_deg = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    meal = relationship("Meal", back_populates="images")


class ImageQualityCheck(Base):
    __tablename__ = "image_quality_checks"

    id = Column(Integer, primary_key=True, index=True)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=True)
    image_path = Column(String(512), nullable=False)
    passed = Column(Boolean, nullable=False)
    quality_score = Column(Float, nullable=False)
    blur_variance = Column(Float, nullable=False)
    brightness_mean = Column(Float, nullable=False)
    marker_visible = Column(Boolean, nullable=False)
    tray_coverage_ratio = Column(Float, nullable=False)
    tilt_degrees = Column(Float, nullable=False, default=0.0)
    issues = Column(JSON, nullable=False)  # List of plain guidance codes/messages e.g. ["Marker not visible", "Too dark"]
    retake_guidance = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    meal = relationship("Meal", back_populates="quality_checks")


class FoodDetection(Base):
    __tablename__ = "food_detections"

    id = Column(Integer, primary_key=True, index=True)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False, index=True)
    compartment_id = Column(String(64), nullable=False)
    compartment_name = Column(String(128), nullable=False)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=True)
    detected_food_name = Column(String(128), nullable=False)
    raw_confidence = Column(Float, nullable=False)
    calibrated_confidence = Column(Float, nullable=False)
    is_low_confidence = Column(Boolean, default=False, nullable=False)

    fill_fraction = Column(Float, nullable=False)
    geometric_grams = Column(Float, nullable=False)
    estimated_grams_low = Column(Float, nullable=False)
    estimated_grams_likely = Column(Float, nullable=False)
    estimated_grams_high = Column(Float, nullable=False)
    is_portion_calibrated = Column(Boolean, default=False, nullable=False)
    calibration_sample_count = Column(Integer, default=0, nullable=False)

    calories_low = Column(Float, nullable=True)
    calories_likely = Column(Float, nullable=True)
    calories_high = Column(Float, nullable=True)
    protein_low = Column(Float, nullable=True)
    protein_likely = Column(Float, nullable=True)
    protein_high = Column(Float, nullable=True)

    nutrition_verified = Column(Boolean, default=False, nullable=False)
    nutrition_missing = Column(Boolean, default=False, nullable=False)
    nutrition_source = Column(String(128), nullable=True)
    manually_corrected = Column(Boolean, default=False, nullable=False)

    meal = relationship("Meal", back_populates="detections")
    food_item = relationship("FoodItem", back_populates="detections")


class NutritionRecord(Base):
    __tablename__ = "nutrition_records"

    id = Column(Integer, primary_key=True, index=True)
    meal_id = Column(Integer, ForeignKey("meals.id"), unique=True, nullable=False)
    norm_id = Column(Integer, ForeignKey("nutrition_norms.id"), nullable=True)

    total_calories_low = Column(Float, nullable=False)
    total_calories_likely = Column(Float, nullable=False)
    total_calories_high = Column(Float, nullable=False)

    total_protein_low = Column(Float, nullable=False)
    total_protein_likely = Column(Float, nullable=False)
    total_protein_high = Column(Float, nullable=False)

    target_calories = Column(Float, nullable=False)
    target_protein = Column(Float, nullable=False)
    tolerance_pct = Column(Float, nullable=False, default=10.0)

    calorie_gap_likely = Column(Float, nullable=False)
    protein_gap_likely = Column(Float, nullable=False)
    range_straddles_threshold = Column(Boolean, default=False, nullable=False)
    has_unverified_nutrition = Column(Boolean, default=True, nullable=False)
    has_missing_nutrition = Column(Boolean, default=False, nullable=False)
    has_uncalibrated_portions = Column(Boolean, default=True, nullable=False)
    excluded_items = Column(JSON, nullable=False, default=list)
    ai_explanation = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    meal = relationship("Meal", back_populates="nutrition_record")


class VerificationRecord(Base):
    __tablename__ = "verification_records"

    id = Column(Integer, primary_key=True, index=True)
    meal_id = Column(Integer, ForeignKey("meals.id"), nullable=False, index=True)
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(64), nullable=False)  # VERIFY, CORRECT_FOOD, CORRECT_PORTION, REJECT, ADD_NOTES, AUTO_FLAGGED
    previous_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    reason = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    meal = relationship("Meal", back_populates="verification_records")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255), nullable=True)
    user_role = Column(String(64), nullable=True)
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(String(64), nullable=True)
    action = Column(String(128), nullable=False)
    previous_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class CalibrationModel(Base):
    __tablename__ = "calibration_models"

    id = Column(Integer, primary_key=True, index=True)
    food_item_id = Column(Integer, ForeignKey("food_items.id"), nullable=False, index=True)
    version = Column(String(64), nullable=False)
    model_type = Column(String(64), nullable=False, default="linear_regression")  # linear_regression, isotonic
    sample_count = Column(Integer, nullable=False, default=0)
    is_calibrated = Column(Boolean, nullable=False, default=False)
    slope = Column(Float, nullable=False, default=1.0)
    intercept = Column(Float, nullable=False, default=0.0)
    residual_p10_g = Column(Float, nullable=False, default=-18.0)  # 10th percentile residual (true - pred)
    residual_p50_g = Column(Float, nullable=False, default=0.0)
    residual_p90_g = Column(Float, nullable=False, default=18.0)  # 90th percentile residual
    mae_g = Column(Float, nullable=True)
    mape_pct = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    trained_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    food_item = relationship("FoodItem", back_populates="calibration_models")


class DatasetSample(Base):
    __tablename__ = "dataset_samples"

    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String(512), nullable=False)
    compartment_id = Column(String(64), nullable=False)
    food_class = Column(String(128), nullable=False, index=True)
    weighed_grams = Column(Float, nullable=False)
    geometric_estimate_g = Column(Float, nullable=True)
    session_id = Column(String(128), nullable=False, index=True)
    lighting_condition = Column(String(128), nullable=False, default="Indoor Natural")
    device_model = Column(String(128), nullable=True, default="Android Camera")
    photographer = Column(String(128), nullable=False)
    split = Column(String(32), nullable=True)  # train, val, test (assigned by session_id)
    status = Column(String(64), nullable=False, default="APPROVED")  # APPROVED, CANDIDATE_NEEDS_REVIEW, REJECTED
    quality_passed = Column(Boolean, default=True, nullable=False)
    source_meal_id = Column(Integer, ForeignKey("meals.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    version_tag = Column(String(128), unique=True, nullable=False)
    architecture = Column(String(128), nullable=False, default="mobilenet_v3_small")
    weights_path = Column(String(512), nullable=False)
    metadata_path = Column(String(512), nullable=True)
    classes = Column(JSON, nullable=False)
    dataset_hash = Column(String(128), nullable=False)
    train_samples = Column(Integer, nullable=False, default=0)
    val_samples = Column(Integer, nullable=False, default=0)
    test_samples = Column(Integer, nullable=False, default=0)
    temperature_scale = Column(Float, nullable=False, default=1.0)
    low_confidence_threshold = Column(Float, nullable=False, default=0.65)
    is_smoke_test = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    trained_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    evaluations = relationship("ModelEvaluation", back_populates="model_version", cascade="all, delete-orphan")


class ModelEvaluation(Base):
    __tablename__ = "model_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    model_version_id = Column(Integer, ForeignKey("model_versions.id"), nullable=False)
    metrics_json = Column(JSON, nullable=False)
    report_path = Column(String(512), nullable=True)
    evaluated_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    model_version = relationship("ModelVersion", back_populates="evaluations")
