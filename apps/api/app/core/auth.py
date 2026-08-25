from typing import Optional
from fastapi import Header, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import get_db
from app.models.domain import User, LearnerProfile

async def get_current_user(
    x_user_email: Optional[str] = Header(None, alias="X-User-Email"),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Resolves the current requesting user based on header authentication (or defaults to demo user in development).
    """
    target_email = x_user_email.strip() if x_user_email and x_user_email.strip() else "demo@pathfinder.dev"
    
    stmt = select(User).where(User.email == target_email)
    user = (await db.execute(stmt)).scalars().first()
    
    if not user:
        # Auto-create if demo/admin email
        role = "admin" if target_email in ("admin@pathfinder.dev", "demo@pathfinder.dev") else "learner"
        user = User(
            clerk_id=f"clerk_{target_email.replace('@', '_').replace('.', '_')}",
            email=target_email,
            name=target_email.split("@")[0].title(),
            role=role,
            is_active=True
        )
        db.add(user)
        await db.flush()
        
        # Also create profile for the user
        profile = LearnerProfile(user_id=user.id, current_context="Backend Software Engineer")
        db.add(profile)
        await db.commit()
        
    return user

async def require_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Requires the user to be active (not suspended/deactivated).
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated or suspended."
        )
    return current_user

async def require_admin(
    current_user: User = Depends(require_active_user)
) -> User:
    """
    Enforces that the requesting user has the 'admin' role.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required for this operation."
        )
    return current_user

async def require_approved_mentor(
    current_user: User = Depends(require_active_user)
) -> User:
    """
    Enforces that the requesting user has the 'mentor' role.
    """
    if current_user.role != "mentor" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Approved mentor access required for this operation."
        )
    return current_user
