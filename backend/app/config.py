import os
from pathlib import Path
from pydantic_settings import BaseSettings

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "ThaliCheck — AI-Based Meal Nutrition Monitoring System"
    VERSION: str = "1.0.0"
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(PROJECT_ROOT / 'data' / 'thalicheck_local.db').as_posix()}"
        if os.getenv("THALICHECK_USE_SQLITE_FALLBACK", "0") == "1"
        else "postgresql://postgres:postgres@localhost:5432/thalicheck",
    )
    JWT_SECRET: str = os.getenv(
        "JWT_SECRET",
        "thalicheck-local-dev-secret-change-in-production-9f8e7d6c5b4a3210",
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    UPLOAD_DIR: Path = PROJECT_ROOT / os.getenv("UPLOAD_DIR", "data/uploads")
    DATASET_DIR: Path = PROJECT_ROOT / os.getenv("DATASET_DIR", "data/dataset")
    DEMO_DIR: Path = PROJECT_ROOT / "data/demo"
    TRAY_CONFIG_PATH: Path = PROJECT_ROOT / os.getenv("TRAY_CONFIG_PATH", "data/tray/tray_config.json")
    FOODS_SEED_PATH: Path = PROJECT_ROOT / os.getenv("FOODS_SEED_PATH", "data/nutrition/foods_seed.csv")
    MODEL_WEIGHTS_DIR: Path = PROJECT_ROOT / os.getenv("MODEL_WEIGHTS_DIR", "ai_models/weights")
    MODEL_REPORTS_DIR: Path = PROJECT_ROOT / os.getenv("MODEL_REPORTS_DIR", "ai_models/reports")

    LOW_CONFIDENCE_THRESHOLD: float = float(os.getenv("LOW_CONFIDENCE_THRESHOLD", "0.65"))
    MIN_CALIBRATION_SAMPLES: int = int(os.getenv("MIN_CALIBRATION_SAMPLES", "30"))
    MIN_DATASET_IMAGES_PER_CLASS: int = int(os.getenv("MIN_DATASET_IMAGES_PER_CLASS", "50"))

    class Config:
        env_file = str(PROJECT_ROOT / ".env")
        extra = "ignore"


settings = Settings()

for directory in [
    settings.UPLOAD_DIR,
    settings.DATASET_DIR,
    settings.DEMO_DIR,
    settings.MODEL_WEIGHTS_DIR,
    settings.MODEL_REPORTS_DIR,
    settings.TRAY_CONFIG_PATH.parent,
    settings.FOODS_SEED_PATH.parent,
]:
    directory.mkdir(parents=True, exist_ok=True)
