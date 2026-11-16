from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    full_name: str
    password: str
    role: str = "STAFF"
    school_id: Optional[int] = None


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    school_id: Optional[int] = None
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class SchoolCreate(BaseModel):
    code: str
    name: str
    center_type: str = "PRIMARY_SCHOOL"
    district: str
    block: str
    scheme: str = "PM POSHAN"
    default_age_group: str = "6-10 years (Primary)"
    enrolled_children: int = 120


class SchoolOut(SchoolCreate):
    id: int
    is_active: bool

    class Config:
        from_attributes = True


class FoodItemCreate(BaseModel):
    code: str
    name: str
    category: str = "General"
    calories_per_100g: Optional[float] = None
    protein_per_100g: Optional[float] = None
    carbs_per_100g: Optional[float] = None
    fat_per_100g: Optional[float] = 0.0
    fiber_per_100g: Optional[float] = 0.0
    density_g_per_ml: float = 0.85
    source: str = "user-entered"
    source_reference: Optional[str] = None
    verified: bool = False
    is_recipe_based: bool = False


class FoodItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    calories_per_100g: Optional[float] = None
    protein_per_100g: Optional[float] = None
    carbs_per_100g: Optional[float] = None
    fat_per_100g: Optional[float] = None
    fiber_per_100g: Optional[float] = None
    density_g_per_ml: Optional[float] = None
    source: Optional[str] = None
    source_reference: Optional[str] = None
    verified: Optional[bool] = None
    is_recipe_based: Optional[bool] = None


class RecipeIngredientInput(BaseModel):
    ingredient_name: str
    raw_weight_g: float
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float = 0.0


class RecipeCreate(BaseModel):
    food_item_id: int
    school_id: Optional[int] = None
    name: str
    cooking_yield_factor: float = 2.2
    serving_size_g: float = 150.0
    notes: Optional[str] = None
    verified: bool = False
    ingredients: List[RecipeIngredientInput] = Field(default_factory=list)


class NutritionNormCreate(BaseModel):
    scheme: str = "PM POSHAN"
    age_group: str
    meal_type: str = "LUNCH"
    calorie_target: float
    protein_target: float
    tolerance_pct: float = 10.0
    severe_shortfall_pct: float = 22.0
    description: Optional[str] = None


class MealCreate(BaseModel):
    school_id: int
    meal_date: str
    meal_type: str = "LUNCH"
    scheme: str = "PM POSHAN"
    age_group: str = "6-10 years (Primary)"
    children_served: int = 85
    notes: Optional[str] = None
    is_demo: bool = False


class VerificationActionRequest(BaseModel):
    action: str  # VERIFY, CORRECT_FOOD, CORRECT_PORTION, REJECT, ADD_NOTES
    reason: str
    notes: Optional[str] = None
    detection_id: Optional[int] = None
    corrected_food_name: Optional[str] = None
    corrected_grams: Optional[float] = None


class DatasetCompartmentSample(BaseModel):
    compartment_id: str
    food_class: str
    weighed_grams: float


class TrayConfigUpdate(BaseModel):
    tray_name: str
    version: str
    tray_width_cm: float
    tray_height_cm: float
    marker: Dict[str, Any]
    compartments: List[Dict[str, Any]]
    default_meal_mapping: Dict[str, Dict[str, str]]
