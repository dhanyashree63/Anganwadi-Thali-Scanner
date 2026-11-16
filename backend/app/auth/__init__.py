from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import User, AuditLog

try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    _HAS_PASSLIB = True
except Exception:
    _HAS_PASSLIB = False

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    if _HAS_PASSLIB:
        try:
            return pwd_context.hash(password)
        except Exception:
            pass
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000).hex()
    return f"pbkdf2_sha256${salt}${digest}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    if hashed_password.startswith("pbkdf2_sha256$"):
        parts = hashed_password.split("$")
        if len(parts) != 3:
            return False
        _, salt, expected = parts
        actual = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 120000).hex()
        return hmac.compare_digest(actual, expected)
    if _HAS_PASSLIB:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False
    return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in with valid credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token payload.",
            )
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired or invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated.",
        )
    return user


def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(allowed_roles)}. Your role: {current_user.role}.",
            )
        return current_user

    return role_checker


def record_audit_log(
    db: Session,
    user: Optional[User],
    entity_type: str,
    entity_id: Optional[str],
    action: str,
    previous_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
    reason: Optional[str] = None,
):
    log_entry = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else "system@thalicheck.local",
        user_role=user.role if user else "SYSTEM",
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        action=action,
        previous_value=previous_value,
        new_value=new_value,
        reason=reason,
    )
    db.add(log_entry)
    db.flush()
    return log_entry
