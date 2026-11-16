import logging
import socket
from urllib.parse import urlparse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings, PROJECT_ROOT

logger = logging.getLogger(__name__)


def _is_tcp_port_reachable(db_url: str, timeout_sec: float = 0.5) -> bool:
    try:
        parsed = urlparse(db_url)
        host = parsed.hostname or "127.0.0.1"
        if host == "localhost":
            host = "127.0.0.1"
        port = parsed.port or 5432
        with socket.create_connection((host, port), timeout=timeout_sec):
            return True
    except Exception:
        return False


def _create_resilient_engine():
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite"):
        return create_engine(db_url, connect_args={"check_same_thread": False})

    if _is_tcp_port_reachable(db_url, timeout_sec=0.5):
        try:
            engine_pg = create_engine(
                db_url,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 2},
            )
            with engine_pg.connect() as conn:
                conn.execute(text("SELECT 1"))
            return engine_pg
        except Exception as exc:
            logger.warning("PostgreSQL connection at %s failed (%s).", db_url, exc)

    fallback_path = PROJECT_ROOT / "data" / "thalicheck_pg_local.db"
    fallback_url = f"sqlite:///{fallback_path.as_posix()}"
    logger.warning(
        "PostgreSQL service at %s is not reachable on port 5432. Using local SQLAlchemy relational DB at %s.",
        db_url,
        fallback_url,
    )
    return create_engine(fallback_url, connect_args={"check_same_thread": False})


engine = _create_resilient_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
