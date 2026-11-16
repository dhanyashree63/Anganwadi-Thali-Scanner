from contextlib import asynccontextmanager
import logging
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.config import settings, PROJECT_ROOT
from app.database import Base, SessionLocal, engine
from app.routes.api_routes import router as api_router

logger = logging.getLogger("thalicheck")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema and seed data exist on startup
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        from scripts.seed_demo_data import seed_all_data
        seed_all_data(db)
    except Exception as exc:
        logger.warning("Startup seed warning: %s", exc)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Local-first AI-assisted school & Anganwadi meal nutrition monitoring system. "
        "Communicates honest estimates with uncertainty ranges, calibrated confidence, and human verification."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def safe_global_exception_handler(request: Request, exc: Exception):
    """
    Security requirement (Section 20):
    Return safe, user-friendly JSON error responses and never expose raw Python stack traces.
    """
    logger.error("Unhandled error on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal processing error occurred. Please check your input or contact the system administrator."
        },
    )


data_dir = PROJECT_ROOT / "data"
data_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static-files", StaticFiles(directory=str(data_dir)), name="static-files")

app.include_router(api_router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ThaliCheck Local AI Nutrition Monitoring API",
        "version": settings.VERSION,
    }
