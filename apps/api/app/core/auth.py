"""
Core Authentication and Role-Based Access Control (RBAC) Module.

Provides:
- Secure PBKDF2-SHA256 password hashing and verification
- JWT access token generation and validation
- Canonical roles: LEARNER, MENTOR, ADMIN
- Idempotent default admin bootstrap (admin@aven.com / Aven@123)
- FastAPI dependencies: get_current_user, require_active_user, require_learner, require_mentor, require_admin
"""
import os
import hmac
import hashlib
import secrets
from enum import Enum
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import jwt
from fastapi import Header, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.db import get_db
from app.models.domain import User, LearnerProfile

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "aven-secure-jwt-secret-key-32-chars-long-min!!")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

DEFAULT_ADMIN_EMAIL = "admin@aven.com"
DEFAULT_ADMIN_PASSWORD = "Aven@123"


# ---------------------------------------------------------------------------
# Canonical Roles
# ---------------------------------------------------------------------------

class UserRole(str, Enum):
    LEARNER = "LEARNER"
    MENTOR = "MENTOR"
    ADMIN = "ADMIN"

def normalize_role(role_val: Optional[str]) -> str:
    """
    Standardizes any input role string into canonical LEARNER, MENTOR, or ADMIN.
    Provides backward compatibility with lowercase or legacy strings.
    """
    if not role_val:
        return UserRole.LEARNER.value
    clean = role_val.strip().upper()
    if clean in ("ADMIN", "PLATFORM_ADMIN"):
        return UserRole.ADMIN.value
    if clean in ("MENTOR", "APPROVED_MENTOR"):
        return UserRole.MENTOR.value
    return UserRole.LEARNER.value


# ---------------------------------------------------------------------------
# Password Hashing (PBKDF2-HMAC-SHA256 with Salt)
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with a cryptographically secure random salt.
    Format: pbkdf2_sha256$100000$<salt_hex>$<hash_hex>
    """
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"pbkdf2_sha256$100000${salt.hex()}${dk.hex()}"

def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """
    Verifies a plaintext password against the stored PBKDF2 hash.
    Constant-time comparison prevents timing attacks.
    """
    if not hashed_password or not plain_password:
        return False
    try:
        parts = hashed_password.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_dk = bytes.fromhex(parts[3])
        actual_dk = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(expected_dk, actual_dk)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT Token Utilities
# ---------------------------------------------------------------------------

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a signed JWT access token containing subject, role, and expiration.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=JWT_EXPIRATION_HOURS))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates a signed JWT token.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except (jwt.PyJWTError, Exception):
        return None


# ---------------------------------------------------------------------------
# Idempotent Admin Bootstrap
# ---------------------------------------------------------------------------

async def ensure_default_admin(db: AsyncSession) -> User:
    """
    Idempotently ensures the canonical development/demo admin account exists with a securely hashed password.
    Email: admin@aven.com
    Password: Aven@123 (hashed in database)
    Role: ADMIN
    """
    normalized_email = DEFAULT_ADMIN_EMAIL.strip().lower()
    stmt = select(User).where(User.email == normalized_email)
    admin_user = (await db.execute(stmt)).scalars().first()

    if not admin_user:
        hashed_pwd = hash_password(DEFAULT_ADMIN_PASSWORD)
        admin_user = User(
            clerk_id=f"clerk_{normalized_email.replace('@', '_').replace('.', '_')}",
            email=normalized_email,
            password_hash=hashed_pwd,
            name="System Administrator",
            role=UserRole.ADMIN.value,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add(admin_user)
        await db.commit()
        await db.refresh(admin_user)

        # Ensure learner profile exists for admin if needed
        profile_stmt = select(LearnerProfile).where(LearnerProfile.user_id == admin_user.id)
        if not (await db.execute(profile_stmt)).scalars().first():
            db.add(LearnerProfile(user_id=admin_user.id, current_context="Platform Administration"))
            await db.commit()
    else:
        # If admin exists but has no password_hash or lowercase role, normalize
        changed = False
        if not admin_user.password_hash:
            admin_user.password_hash = hash_password(DEFAULT_ADMIN_PASSWORD)
            changed = True
        if admin_user.role != UserRole.ADMIN.value:
            admin_user.role = UserRole.ADMIN.value
            changed = True
        if changed:
            await db.commit()
            await db.refresh(admin_user)

    return admin_user


# ---------------------------------------------------------------------------
# FastAPI Auth & RBAC Dependencies
# ---------------------------------------------------------------------------

async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Resolves the authenticated User entity from either:
    1. Bearer JWT token in Authorization header
    2. X-User-Email header (for test suite and backward compatibility)
    """
    target_email: Optional[str] = None

    # 1. Try JWT Authorization Header
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1].strip()
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token."
            )
        target_email = str(payload["sub"]).strip().lower()

    # 2. Fallback to X-User-Email header (for development & automated test suites)
    if not target_email and x_user_email and x_user_email.strip():
        target_email = x_user_email.strip().lower()

    # 3. Default demo fallback for local development if neither provided
    if not target_email:
        target_email = "demo@pathfinder.dev"

    stmt = select(User).where(User.email == target_email)
    user = (await db.execute(stmt)).scalars().first()

    if not user:
        # Determine canonical role based on known conventions for test/dev auto-creation
        if target_email in ("admin@aven.com", "admin@pathfinder.dev", "test_admin@pathfinder.dev"):
            role = UserRole.ADMIN.value
        elif "mentor" in target_email:
            role = UserRole.MENTOR.value
        else:
            role = UserRole.LEARNER.value

        user = User(
            clerk_id=f"clerk_{target_email.replace('@', '_').replace('.', '_')}",
            email=target_email,
            password_hash=hash_password("Aven@123"),
            name=target_email.split("@")[0].replace("_", " ").title(),
            role=role,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.flush()

        profile = LearnerProfile(user_id=user.id, current_context="Software Engineering Track")
        db.add(profile)
        await db.commit()
        await db.refresh(user)

    return user


async def require_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Enforces that the user account is active (not deactivated or suspended).
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated or suspended."
        )
    return current_user


async def require_learner(
    current_user: User = Depends(require_active_user)
) -> User:
    """
    Enforces that the requesting user is a LEARNER (or ADMIN).
    """
    role = normalize_role(current_user.role)
    if role not in (UserRole.LEARNER.value, UserRole.ADMIN.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Learner access required for this operation."
        )
    return current_user


async def require_approved_mentor(
    current_user: User = Depends(require_active_user)
) -> User:
    """
    Enforces that the requesting user has the MENTOR (or ADMIN) role.
    """
    role = normalize_role(current_user.role)
    if role not in (UserRole.MENTOR.value, UserRole.ADMIN.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Approved mentor access required for this operation."
        )
    return current_user

require_mentor = require_approved_mentor


async def require_admin(
    current_user: User = Depends(require_active_user)
) -> User:
    """
    Enforces that the requesting user strictly has the ADMIN role.
    """
    role = normalize_role(current_user.role)
    if role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required for this operation."
        )
    return current_user
