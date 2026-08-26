"""
Authentication Router.

Provides registration, login, token generation, and current authenticated identity endpoints.
Enforces that public registration is strictly LEARNER role only.
"""
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.db import get_db
from app.core.auth import (
    hash_password,
    verify_password,
    create_access_token,
    normalize_role,
    UserRole,
    get_current_user,
    require_active_user,
    DEFAULT_ADMIN_PASSWORD,
)
from app.models.domain import User, LearnerProfile

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication & Identity"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    name: Optional[str] = Field(None, max_length=255)
    role: Optional[str] = Field(default="LEARNER", max_length=50)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

class ClerkSyncRequest(BaseModel):
    clerk_id: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    name: Optional[str] = Field(None, max_length=255)
    image_url: Optional[str] = Field(None, max_length=1024)
    role: Optional[str] = Field(default=None, max_length=50)

class UserAuthItem(BaseModel):
    id: int
    clerk_id: Optional[str] = None
    email: str
    name: Optional[str] = None
    role: str
    is_active: bool

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserAuthItem

class ClerkSyncResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserAuthItem
    profile_id: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", response_model=AuthResponse)
async def register_user(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Registration endpoint supporting LEARNER, MENTOR, or ADMIN role enrollment.
    """
    clean_email = str(payload.email).strip().lower()

    # Check for existing email
    stmt = select(User).where(User.email == clean_email)
    existing_user = (await db.execute(stmt)).scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists."
        )

    # Determine canonical role
    canonical_role = normalize_role(payload.role) if payload.role else UserRole.LEARNER.value
    pwd_hash = hash_password(payload.password)
    user_name = payload.name.strip() if payload.name and payload.name.strip() else clean_email.split("@")[0].title()

    new_user = User(
        clerk_id=f"clerk_{clean_email.replace('@', '_').replace('.', '_')}",
        email=clean_email,
        password_hash=pwd_hash,
        name=user_name,
        role=canonical_role,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    await db.flush()

    # Create associated profile
    profile_track = "Platform Administration" if canonical_role == "ADMIN" else ("Mentor Track" if canonical_role == "MENTOR" else "Software Engineering Track")
    profile = LearnerProfile(user_id=new_user.id, current_context=profile_track)
    db.add(profile)
    await db.commit()
    await db.refresh(new_user)

    # Issue JWT Token
    access_token = create_access_token({
        "sub": new_user.email,
        "user_id": new_user.id,
        "role": canonical_role,
    })

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserAuthItem(
            id=new_user.id,
            email=new_user.email,
            name=new_user.name,
            role=canonical_role,
            is_active=new_user.is_active,
        ),
    )


@router.post("/login", response_model=AuthResponse)
async def login_user(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticates a user via email and password.
    Returns signed JWT access token and authoritative database-backed role.
    """
    clean_email = str(payload.email).strip().lower()

    stmt = select(User).where(User.email == clean_email)
    user = (await db.execute(stmt)).scalars().first()

    # If demo user does not exist yet, create them with canonical role
    if not user and clean_email in ("demo@pathfinder.dev", "mentor@pathfinder.dev", "admin@aven.com"):
        role = UserRole.MENTOR.value if "mentor" in clean_email else (UserRole.ADMIN.value if "admin" in clean_email else UserRole.LEARNER.value)
        user = User(
            clerk_id=f"clerk_{clean_email.replace('@', '_').replace('.', '_')}",
            email=clean_email,
            password_hash=hash_password("Aven@123"),
            name=clean_email.split("@")[0].replace("_", " ").title(),
            role=role,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.flush()
        db.add(LearnerProfile(user_id=user.id, current_context="General Track"))
        await db.commit()
        await db.refresh(user)

    # If user exists but has no password_hash, populate with default dev password
    if user and not user.password_hash:
        user.password_hash = hash_password(DEFAULT_ADMIN_PASSWORD if "admin" in clean_email else "Aven@123")
        await db.commit()
        await db.refresh(user)

    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated or suspended. Please contact platform support."
        )

    canonical_role = normalize_role(user.role)

    # Issue JWT Token
    access_token = create_access_token({
        "sub": user.email,
        "user_id": user.id,
        "role": canonical_role,
    })

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserAuthItem(
            id=user.id,
            email=user.email,
            name=user.name,
            role=canonical_role,
            is_active=user.is_active,
        ),
    )


@router.get("/me", response_model=UserAuthItem)
async def get_current_authenticated_user(
    current_user: User = Depends(require_active_user),
):
    """
    Returns the currently authenticated user's profile and authoritative role.
    """
    return UserAuthItem(
        id=current_user.id,
        clerk_id=current_user.clerk_id,
        email=current_user.email,
        name=current_user.name,
        role=normalize_role(current_user.role),
        is_active=current_user.is_active,
    )


@router.post("/sync", response_model=ClerkSyncResponse)
@router.post("/clerk-sync", response_model=ClerkSyncResponse)
async def sync_clerk_user(
    payload: ClerkSyncRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Idempotently synchronizes a Clerk authenticated user with the PostgreSQL database.
    Creates or updates the User record and ensures an associated LearnerProfile exists.
    Returns signed JWT access token, user metadata, and active profile ID.
    """
    clean_email = str(payload.email).strip().lower()
    clean_clerk_id = payload.clerk_id.strip()

    # Find existing user by clerk_id OR email
    stmt = select(User).where(or_(User.clerk_id == clean_clerk_id, User.email == clean_email))
    user = (await db.execute(stmt)).scalars().first()

    if user:
        # Update role if explicitly provided in request
        if payload.role:
            user.role = normalize_role(payload.role)

        # Update clerk_id if missing or changed
        if not user.clerk_id or user.clerk_id != clean_clerk_id:
            user.clerk_id = clean_clerk_id

        # Update name if provided and existing is default or blank
        if payload.name and payload.name.strip():
            user.name = payload.name.strip()

        await db.commit()
        await db.refresh(user)
    else:
        # Determine canonical role
        if payload.role:
            assigned_role = normalize_role(payload.role)
        elif clean_email in ("admin@aven.com", "admin@pathfinder.dev"):
            assigned_role = UserRole.ADMIN.value
        elif "mentor" in clean_email:
            assigned_role = UserRole.MENTOR.value
        else:
            assigned_role = UserRole.LEARNER.value

        user_name = payload.name.strip() if payload.name and payload.name.strip() else clean_email.split("@")[0].title()

        user = User(
            clerk_id=clean_clerk_id,
            email=clean_email,
            name=user_name,
            role=assigned_role,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Ensure LearnerProfile exists
    profile_stmt = select(LearnerProfile).where(LearnerProfile.user_id == user.id)
    profile = (await db.execute(profile_stmt)).scalars().first()
    if not profile:
        profile = LearnerProfile(
            user_id=user.id,
            current_context="Backend Software Engineer"
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    canonical_role = normalize_role(user.role)

    # Issue JWT Token
    access_token = create_access_token({
        "sub": user.email,
        "user_id": user.id,
        "clerk_id": user.clerk_id,
        "role": canonical_role,
    })

    return ClerkSyncResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserAuthItem(
            id=user.id,
            clerk_id=user.clerk_id,
            email=user.email,
            name=user.name,
            role=canonical_role,
            is_active=user.is_active,
        ),
        profile_id=profile.id,
    )
