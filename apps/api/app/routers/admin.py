from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List

from app.core.db import get_db
from app.models.domain import User
from app.api.deps import require_role

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])

class UserResponse(BaseModel):
    id: int
    clerk_id: str
    email: str
    role: str

class RoleUpdateRequest(BaseModel):
    role: str

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    # Only super_admin can list all users
    current_admin: User = Depends(require_role(["super_admin"]))
):
    """
    List all users in the system. Requires super_admin role.
    """
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    return [
        UserResponse(
            id=u.id,
            clerk_id=u.clerk_id,
            email=u.email,
            role=u.role
        )
        for u in users
    ]

@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    payload: RoleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    # Only super_admin can change roles
    current_admin: User = Depends(require_role(["super_admin"]))
):
    """
    Update a user's role. Requires super_admin role.
    Allowed roles are typically 'user', 'admin', 'super_admin'.
    """
    if payload.role not in ["user", "admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified."
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = payload.role
    await db.commit()
    await db.refresh(user)
    
    return UserResponse(
        id=user.id,
        clerk_id=user.clerk_id,
        email=user.email,
        role=user.role
    )
