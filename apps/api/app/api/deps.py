import os
import jwt
from jwt import PyJWKClient
from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import get_db
from app.models.domain import User

security = HTTPBearer()

# Assuming CLERK_SECRET_KEY or CLERK_PUBLISHABLE_KEY is in env to construct JWKS URL
# The standard Clerk JWKS URL is: https://api.clerk.com/v1/jwks or derived from the frontend instance.
CLERK_ISSUER_URL = os.getenv("CLERK_ISSUER_URL", "https://clerk.your-domain.com") # e.g. https://clerk.abc.com
CLERK_JWKS_URL = f"{CLERK_ISSUER_URL}/.well-known/jwks.json"

jwks_client = PyJWKClient(CLERK_JWKS_URL)

async def verify_clerk_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    token = credentials.credentials
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        data = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        return data
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    token_data: dict = Depends(verify_clerk_token),
    db: AsyncSession = Depends(get_db)
) -> User:
    clerk_id = token_data.get("sub")
    if not clerk_id:
        raise HTTPException(status_code=401, detail="Invalid token structure")
    
    # Query user from DB
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    
    if not user:
        # Auto-create user if they don't exist yet in the DB
        # This usually happens if you aren't using Clerk webhooks to sync users
        email = token_data.get("email", f"{clerk_id}@placeholder.com") # Extract email if in token or fallback
        user = User(clerk_id=clerk_id, email=email, role="user")
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    return user

def require_role(allowed_roles: list[str]):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Requires one of: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker
