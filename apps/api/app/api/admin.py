import time
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, text
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.auth import get_current_user, require_active_user, require_admin, require_approved_mentor
from app.models.domain import User, MentorApplication, Resource, ResourceMetadata, SkillRecord
from app.infrastructure.neo4j.client import neo4j_client
from app.schemas.admin import (
    AdminOverviewResponse,
    SystemHealthResponse,
    AdminUserItem,
    AdminUsersListResponse,
    UserStatusUpdateInput,
    UserRoleUpdateInput,
    MentorApplicationItem,
    MentorApplicationsListResponse,
    MentorApplyInput,
    MentorReviewInput,
    PlatformResourceItem,
    PlatformResourcesListResponse,
    ResourceCreateInput,
    ResourceUpdateInput,
    ResourceReviewInput,
)

router = APIRouter(prefix="/api/v1", tags=["Admin & Resources"])

_START_TIME = time.time()


# =============================================================================
# 1. PLATFORM OVERVIEW & SYSTEM MONITORING
# =============================================================================

@router.get("/admin/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Returns aggregated real platform metrics for the Platform Admin Dashboard.
    """
    # 1. Total users
    total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
    
    # 2. Active users
    active_users = (await db.execute(select(func.count(User.id)).where(User.is_active == True))).scalar_one()
    
    # 3. Total approved mentors
    total_mentors = (await db.execute(select(func.count(User.id)).where(User.role == "mentor"))).scalar_one()
    
    # 4. Pending mentor applications
    pending_mentors = (await db.execute(
        select(func.count(MentorApplication.id)).where(MentorApplication.status == "PENDING")
    )).scalar_one()
    
    # 5. Total approved resources
    total_resources = (await db.execute(
        select(func.count(Resource.id)).where(Resource.status == "APPROVED")
    )).scalar_one()
    
    # 6. Pending resource submissions
    pending_resources = (await db.execute(
        select(func.count(Resource.id)).where(Resource.status == "PENDING")
    )).scalar_one()
    
    # 7. Action items
    pending_actions = []
    if pending_mentors > 0:
        pending_actions.append({
            "type": "mentor_applications",
            "count": pending_mentors,
            "message": f"{pending_mentors} mentor application{'s' if pending_mentors != 1 else ''} awaiting review",
            "action_url": "/admin?tab=mentors&status=PENDING"
        })
    if pending_resources > 0:
        pending_actions.append({
            "type": "resource_submissions",
            "count": pending_resources,
            "message": f"{pending_resources} resource submission{'s' if pending_resources != 1 else ''} awaiting approval",
            "action_url": "/admin?tab=resources&status=PENDING"
        })

    return AdminOverviewResponse(
        total_users=total_users,
        active_users=active_users,
        total_mentors=total_mentors,
        pending_mentors=pending_mentors,
        total_resources=total_resources,
        pending_resources=pending_resources,
        pending_actions=pending_actions
    )


@router.get("/admin/system", response_model=SystemHealthResponse)
async def get_system_health(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Returns real system and infrastructure status.
    """
    uptime = time.time() - _START_TIME
    
    # Test primary relational database
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {e}"
        
    # Test Neo4j connection
    neo4j_status = "connected"
    try:
        with neo4j_client.driver.session() as session:
            session.run("RETURN 1")
    except Exception as e:
        neo4j_status = f"disconnected: {e}"
        
    overall_status = "healthy" if db_status == "healthy" and "disconnected" not in neo4j_status else "degraded"
    
    return SystemHealthResponse(
        status=overall_status,
        uptime_seconds=round(uptime, 1),
        api_status="online",
        database_status=db_status,
        graph_db_status=neo4j_status,
        scraper_sources_count=5,
        timestamp=datetime.now(timezone.utc).isoformat()
    )


# =============================================================================
# 2. BASIC USER MANAGEMENT
# =============================================================================

@router.get("/admin/users", response_model=AdminUsersListResponse)
async def get_admin_users(
    q: Optional[str] = Query(None, description="Search query by name or email"),
    role: Optional[str] = Query(None, description="Filter by role (learner, mentor, admin)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Lists users with search, role/status filtering, and pagination.
    """
    query = select(User)
    count_query = select(func.count(User.id))
    
    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        condition = or_(User.email.ilike(search_pattern), User.name.ilike(search_pattern))
        query = query.where(condition)
        count_query = count_query.where(condition)
        
    if role and role.strip():
        query = query.where(User.role == role.strip().lower())
        count_query = count_query.where(User.role == role.strip().lower())
        
    if is_active is not None:
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)
        
    total = (await db.execute(count_query)).scalar_one()
    users_result = (await db.execute(query.order_by(User.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    
    user_items = [
        AdminUserItem(
            id=u.id,
            clerk_id=u.clerk_id,
            email=u.email,
            name=u.name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at.isoformat() if u.created_at else datetime.now(timezone.utc).isoformat()
        )
        for u in users_result
    ]
    
    return AdminUsersListResponse(users=user_items, total=total)


@router.patch("/admin/users/{user_id}/status", response_model=AdminUserItem)
async def update_user_status(
    user_id: int,
    payload: UserStatusUpdateInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Safely activates or suspends/deactivates a user account.
    """
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Prevent self-deactivation of current admin
    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="Admins cannot deactivate their own active account.")
        
    user.is_active = payload.is_active
    await db.commit()
    await db.refresh(user)
    
    return AdminUserItem(
        id=user.id,
        clerk_id=user.clerk_id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else datetime.now(timezone.utc).isoformat()
    )


@router.patch("/admin/users/{user_id}/role", response_model=AdminUserItem)
async def update_user_role(
    user_id: int,
    payload: UserRoleUpdateInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Updates a user's role (learner, mentor, admin).
    """
    new_role = payload.role.strip().lower()
    if new_role not in ("learner", "mentor", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be 'learner', 'mentor', or 'admin'.")
        
    user = (await db.execute(select(User).where(User.id == user_id))).scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Prevent self-demotion from admin
    if user.id == current_user.id and new_role != "admin":
        raise HTTPException(status_code=400, detail="Admins cannot demote their own account.")
        
    user.role = new_role
    await db.commit()
    await db.refresh(user)
    
    return AdminUserItem(
        id=user.id,
        clerk_id=user.clerk_id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at.isoformat() if user.created_at else datetime.now(timezone.utc).isoformat()
    )


# =============================================================================
# 3. MENTOR APPLICATION & APPROVAL WORKFLOW
# =============================================================================

@router.post("/mentor/apply", response_model=MentorApplicationItem)
async def apply_to_be_mentor(
    payload: MentorApplyInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_active_user)
):
    """
    Learner submits an application to become an approved mentor.
    Status starts in PENDING.
    """
    # Check if existing pending or approved application exists
    stmt = select(MentorApplication).where(
        MentorApplication.user_id == current_user.id,
        MentorApplication.status.in_(["PENDING", "APPROVED"])
    )
    existing = (await db.execute(stmt)).scalars().first()
    if existing:
        if existing.status == "APPROVED":
            raise HTTPException(status_code=400, detail="You are already an approved mentor.")
        else:
            raise HTTPException(status_code=400, detail="You already have a mentor application pending review.")
            
    app = MentorApplication(
        user_id=current_user.id,
        name=payload.name.strip(),
        expertise=payload.expertise.strip(),
        bio=payload.bio.strip() if payload.bio else None,
        linkedin_url=payload.linkedin_url.strip() if payload.linkedin_url else None,
        status="PENDING"
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)
    
    return MentorApplicationItem(
        id=app.id,
        user_id=app.user_id,
        user_email=current_user.email,
        name=app.name,
        expertise=app.expertise,
        bio=app.bio,
        linkedin_url=app.linkedin_url,
        status=app.status,
        rejection_reason=app.rejection_reason,
        created_at=app.created_at.isoformat() if app.created_at else datetime.now(timezone.utc).isoformat(),
        updated_at=app.updated_at.isoformat() if app.updated_at else datetime.now(timezone.utc).isoformat()
    )


@router.get("/mentor/application", response_model=Optional[MentorApplicationItem])
async def get_my_mentor_application(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_active_user)
):
    """
    Returns the requesting user's most recent mentor application.
    """
    stmt = select(MentorApplication).where(MentorApplication.user_id == current_user.id).order_by(MentorApplication.created_at.desc())
    app = (await db.execute(stmt)).scalars().first()
    if not app:
        return None
        
    return MentorApplicationItem(
        id=app.id,
        user_id=app.user_id,
        user_email=current_user.email,
        name=app.name,
        expertise=app.expertise,
        bio=app.bio,
        linkedin_url=app.linkedin_url,
        status=app.status,
        rejection_reason=app.rejection_reason,
        created_at=app.created_at.isoformat() if app.created_at else datetime.now(timezone.utc).isoformat(),
        updated_at=app.updated_at.isoformat() if app.updated_at else datetime.now(timezone.utc).isoformat()
    )


@router.get("/admin/mentors", response_model=MentorApplicationsListResponse)
async def get_admin_mentors(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (PENDING, APPROVED, REJECTED)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin lists mentor applications with optional status filtering.
    """
    query = select(MentorApplication).options(selectinload(MentorApplication.user))
    count_query = select(func.count(MentorApplication.id))
    
    if status_filter and status_filter.strip():
        st = status_filter.strip().upper()
        query = query.where(MentorApplication.status == st)
        count_query = count_query.where(MentorApplication.status == st)
        
    total = (await db.execute(count_query)).scalar_one()
    applications = (await db.execute(query.order_by(MentorApplication.created_at.desc()))).scalars().all()
    
    items = [
        MentorApplicationItem(
            id=a.id,
            user_id=a.user_id,
            user_email=a.user.email if a.user else f"user_{a.user_id}",
            name=a.name,
            expertise=a.expertise,
            bio=a.bio,
            linkedin_url=a.linkedin_url,
            status=a.status,
            rejection_reason=a.rejection_reason,
            created_at=a.created_at.isoformat() if a.created_at else datetime.now(timezone.utc).isoformat(),
            updated_at=a.updated_at.isoformat() if a.updated_at else datetime.now(timezone.utc).isoformat()
        )
        for a in applications
    ]
    
    return MentorApplicationsListResponse(applications=items, total=total)


@router.post("/admin/mentors/{application_id}/approve", response_model=MentorApplicationItem)
async def approve_mentor_application(
    application_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin approves a mentor application:
    - Status set to APPROVED
    - User's role updated to 'mentor'
    """
    stmt = select(MentorApplication).where(MentorApplication.id == application_id).options(selectinload(MentorApplication.user))
    app = (await db.execute(stmt)).scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Mentor application not found.")
        
    app.status = "APPROVED"
    app.rejection_reason = None
    
    # Update user's role to mentor
    if app.user:
        app.user.role = "mentor"
        if not app.user.name and app.name:
            app.user.name = app.name
            
    await db.commit()
    await db.refresh(app)
    
    return MentorApplicationItem(
        id=app.id,
        user_id=app.user_id,
        user_email=app.user.email if app.user else f"user_{app.user_id}",
        name=app.name,
        expertise=app.expertise,
        bio=app.bio,
        linkedin_url=app.linkedin_url,
        status=app.status,
        rejection_reason=app.rejection_reason,
        created_at=app.created_at.isoformat() if app.created_at else datetime.now(timezone.utc).isoformat(),
        updated_at=app.updated_at.isoformat() if app.updated_at else datetime.now(timezone.utc).isoformat()
    )


@router.post("/admin/mentors/{application_id}/reject", response_model=MentorApplicationItem)
async def reject_mentor_application(
    application_id: int,
    payload: Optional[MentorReviewInput] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin rejects a mentor application:
    - Status set to REJECTED
    - User role remains learner
    """
    stmt = select(MentorApplication).where(MentorApplication.id == application_id).options(selectinload(MentorApplication.user))
    app = (await db.execute(stmt)).scalars().first()
    if not app:
        raise HTTPException(status_code=404, detail="Mentor application not found.")
        
    app.status = "REJECTED"
    app.rejection_reason = payload.reason.strip() if payload and payload.reason else "Application does not meet current platform requirements."
    
    # If user was previously assigned mentor role from this app, reset to learner
    if app.user and app.user.role == "mentor":
        app.user.role = "learner"
        
    await db.commit()
    await db.refresh(app)
    
    return MentorApplicationItem(
        id=app.id,
        user_id=app.user_id,
        user_email=app.user.email if app.user else f"user_{app.user_id}",
        name=app.name,
        expertise=app.expertise,
        bio=app.bio,
        linkedin_url=app.linkedin_url,
        status=app.status,
        rejection_reason=app.rejection_reason,
        created_at=app.created_at.isoformat() if app.created_at else datetime.now(timezone.utc).isoformat(),
        updated_at=app.updated_at.isoformat() if app.updated_at else datetime.now(timezone.utc).isoformat()
    )


# =============================================================================
# 4. RESOURCE MANAGEMENT & APPROVAL WORKFLOW
# =============================================================================

@router.get("/resources", response_model=PlatformResourcesListResponse)
async def get_public_resources(
    skill_id: Optional[str] = Query(None, description="Filter by skill ID"),
    resource_type: Optional[str] = Query(None, description="Filter by type (course, video, tutorial, etc.)"),
    q: Optional[str] = Query(None, description="Search keyword"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Public & learner endpoint: returns only APPROVED resources.
    """
    query = select(Resource).where(Resource.status == "APPROVED").options(selectinload(Resource.submitted_by_user))
    count_query = select(func.count(Resource.id)).where(Resource.status == "APPROVED")
    
    if skill_id and skill_id.strip():
        query = query.where(Resource.skill_id == skill_id.strip())
        count_query = count_query.where(Resource.skill_id == skill_id.strip())
        
    if resource_type and resource_type.strip():
        query = query.where(Resource.resource_type == resource_type.strip().lower())
        count_query = count_query.where(Resource.resource_type == resource_type.strip().lower())
        
    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        condition = or_(Resource.title.ilike(search_pattern), Resource.content.ilike(search_pattern))
        query = query.where(condition)
        count_query = count_query.where(condition)
        
    total = (await db.execute(count_query)).scalar_one()
    resources = (await db.execute(query.order_by(Resource.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    
    items = [
        PlatformResourceItem(
            id=r.id,
            title=r.title,
            content=r.content,
            url=r.url,
            resource_type=r.resource_type,
            skill_id=r.skill_id,
            submitted_by_id=r.submitted_by_id,
            submitted_by_email=r.submitted_by_user.email if r.submitted_by_user else None,
            status=r.status,
            rejection_reason=r.rejection_reason,
            created_at=r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat(),
            updated_at=r.updated_at.isoformat() if r.updated_at else datetime.now(timezone.utc).isoformat()
        )
        for r in resources
    ]
    
    return PlatformResourcesListResponse(resources=items, total=total)


@router.post("/resources/submit", response_model=PlatformResourceItem)
async def submit_mentor_resource(
    payload: ResourceCreateInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor)
):
    """
    Approved mentors submit resources for platform inclusion.
    Status starts in PENDING and is not publicly visible until approved by an admin.
    """
    resource = Resource(
        title=payload.title.strip(),
        content=payload.content.strip(),
        url=payload.url.strip(),
        resource_type=payload.resource_type.strip().lower(),
        skill_id=payload.skill_id.strip() if payload.skill_id else None,
        submitted_by_id=current_user.id,
        status="PENDING"
    )
    
    try:
        from app.services.semantic_mapper import _model
        if _model is not None:
            resource.embedding = _model.encode(resource.content, convert_to_numpy=True).tolist()
    except Exception:
        pass
        
    db.add(resource)
    await db.flush()
    
    if payload.skill_id:
        db.add(ResourceMetadata(resource_id=resource.id, key="skill_id", value=payload.skill_id.strip()))
    db.add(ResourceMetadata(resource_id=resource.id, key="modality", value=payload.resource_type.strip().lower()))
    
    await db.commit()
    await db.refresh(resource)
    
    return PlatformResourceItem(
        id=resource.id,
        title=resource.title,
        content=resource.content,
        url=resource.url,
        resource_type=resource.resource_type,
        skill_id=resource.skill_id,
        submitted_by_id=resource.submitted_by_id,
        submitted_by_email=current_user.email,
        status=resource.status,
        rejection_reason=resource.rejection_reason,
        created_at=resource.created_at.isoformat() if resource.created_at else datetime.now(timezone.utc).isoformat(),
        updated_at=resource.updated_at.isoformat() if resource.updated_at else datetime.now(timezone.utc).isoformat()
    )


@router.get("/resources/my-submissions", response_model=PlatformResourcesListResponse)
async def get_my_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_active_user)
):
    """
    Allows a mentor/user to view the review status of resources they submitted.
    """
    stmt = (
        select(Resource)
        .where(Resource.submitted_by_id == current_user.id)
        .options(selectinload(Resource.submitted_by_user))
        .order_by(Resource.created_at.desc())
    )
    resources = (await db.execute(stmt)).scalars().all()
    
    items = [
        PlatformResourceItem(
            id=r.id,
            title=r.title,
            content=r.content,
            url=r.url,
            resource_type=r.resource_type,
            skill_id=r.skill_id,
            submitted_by_id=r.submitted_by_id,
            submitted_by_email=current_user.email,
            status=r.status,
            rejection_reason=r.rejection_reason,
            created_at=r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat(),
            updated_at=r.updated_at.isoformat() if r.updated_at else datetime.now(timezone.utc).isoformat()
        )
        for r in resources
    ]
    
    return PlatformResourcesListResponse(resources=items, total=len(items))


@router.get("/admin/resources", response_model=PlatformResourcesListResponse)
async def get_admin_resources(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (PENDING, APPROVED, REJECTED)"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    skill_id: Optional[str] = Query(None, description="Filter by skill"),
    q: Optional[str] = Query(None, description="Search query"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin lists all resources with filtering by review status, type, skill, and search query.
    """
    query = select(Resource).options(selectinload(Resource.submitted_by_user))
    count_query = select(func.count(Resource.id))
    
    if status_filter and status_filter.strip():
        st = status_filter.strip().upper()
        query = query.where(Resource.status == st)
        count_query = count_query.where(Resource.status == st)
        
    if resource_type and resource_type.strip():
        rt = resource_type.strip().lower()
        query = query.where(Resource.resource_type == rt)
        count_query = count_query.where(Resource.resource_type == rt)
        
    if skill_id and skill_id.strip():
        query = query.where(Resource.skill_id == skill_id.strip())
        count_query = count_query.where(Resource.skill_id == skill_id.strip())
        
    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        condition = or_(Resource.title.ilike(search_pattern), Resource.content.ilike(search_pattern))
        query = query.where(condition)
        count_query = count_query.where(condition)
        
    total = (await db.execute(count_query)).scalar_one()
    resources = (await db.execute(query.order_by(Resource.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    
    items = [
        PlatformResourceItem(
            id=r.id,
            title=r.title,
            content=r.content,
            url=r.url,
            resource_type=r.resource_type,
            skill_id=r.skill_id,
            submitted_by_id=r.submitted_by_id,
            submitted_by_email=r.submitted_by_user.email if r.submitted_by_user else None,
            status=r.status,
            rejection_reason=r.rejection_reason,
            created_at=r.created_at.isoformat() if r.created_at else datetime.now(timezone.utc).isoformat(),
            updated_at=r.updated_at.isoformat() if r.updated_at else datetime.now(timezone.utc).isoformat()
        )
        for r in resources
    ]
    
    return PlatformResourcesListResponse(resources=items, total=total)


@router.post("/admin/resources", response_model=PlatformResourceItem)
async def create_admin_resource(
    payload: ResourceCreateInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin directly adds a new resource to the platform (status: APPROVED).
    """
    resource = Resource(
        title=payload.title.strip(),
        content=payload.content.strip(),
        url=payload.url.strip(),
        resource_type=payload.resource_type.strip().lower(),
        skill_id=payload.skill_id.strip() if payload.skill_id else None,
        submitted_by_id=current_user.id,
        status="APPROVED"
    )
    
    try:
        from app.services.semantic_mapper import _model
        if _model is not None:
            resource.embedding = _model.encode(resource.content, convert_to_numpy=True).tolist()
    except Exception:
        pass
        
    db.add(resource)
    await db.flush()
    
    if payload.skill_id:
        db.add(ResourceMetadata(resource_id=resource.id, key="skill_id", value=payload.skill_id.strip()))
    db.add(ResourceMetadata(resource_id=resource.id, key="modality", value=payload.resource_type.strip().lower()))
    
    await db.commit()
    await db.refresh(resource)
    
    return PlatformResourceItem(
        id=resource.id,
        title=resource.title,
        content=resource.content,
        url=resource.url,
        resource_type=resource.resource_type,
        skill_id=resource.skill_id,
        submitted_by_id=resource.submitted_by_id,
        submitted_by_email=current_user.email,
        status=resource.status,
        rejection_reason=resource.rejection_reason,
        created_at=resource.created_at.isoformat() if resource.created_at else datetime.now(timezone.utc).isoformat(),
        updated_at=resource.updated_at.isoformat() if resource.updated_at else datetime.now(timezone.utc).isoformat()
    )


@router.put("/admin/resources/{resource_id}", response_model=PlatformResourceItem)
async def update_admin_resource(
    resource_id: int,
    payload: ResourceUpdateInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin edits an existing resource.
    """
    stmt = select(Resource).where(Resource.id == resource_id).options(selectinload(Resource.submitted_by_user))
    resource = (await db.execute(stmt)).scalars().first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
        
    if payload.title is not None:
        resource.title = payload.title.strip()
    if payload.content is not None:
        resource.content = payload.content.strip()
    if payload.url is not None:
        resource.url = payload.url.strip()
    if payload.resource_type is not None:
        resource.resource_type = payload.resource_type.strip().lower()
    if payload.skill_id is not None:
        resource.skill_id = payload.skill_id.strip() if payload.skill_id.strip() else None
        
    await db.commit()
    await db.refresh(resource)
    
    return PlatformResourceItem(
        id=resource.id,
        title=resource.title,
        content=resource.content,
        url=resource.url,
        resource_type=resource.resource_type,
        skill_id=resource.skill_id,
        submitted_by_id=resource.submitted_by_id,
        submitted_by_email=resource.submitted_by_user.email if resource.submitted_by_user else None,
        status=resource.status,
        rejection_reason=resource.rejection_reason,
        created_at=resource.created_at.isoformat() if resource.created_at else datetime.now(timezone.utc).isoformat(),
        updated_at=resource.updated_at.isoformat() if resource.updated_at else datetime.now(timezone.utc).isoformat()
    )


@router.delete("/admin/resources/{resource_id}")
async def delete_admin_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin removes a resource from the platform.
    """
    stmt = select(Resource).where(Resource.id == resource_id)
    resource = (await db.execute(stmt)).scalars().first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
        
    await db.delete(resource)
    await db.commit()
    return {"status": "success", "message": f"Resource #{resource_id} deleted successfully."}


@router.post("/admin/resources/{resource_id}/approve", response_model=PlatformResourceItem)
async def approve_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin approves a pending mentor resource submission:
    - Status set to APPROVED
    - Becomes visible in public/learner queries and learning paths
    """
    stmt = select(Resource).where(Resource.id == resource_id).options(selectinload(Resource.submitted_by_user))
    resource = (await db.execute(stmt)).scalars().first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
        
    resource.status = "APPROVED"
    resource.rejection_reason = None
    
    await db.commit()
    await db.refresh(resource)
    
    return PlatformResourceItem(
        id=resource.id,
        title=resource.title,
        content=resource.content,
        url=resource.url,
        resource_type=resource.resource_type,
        skill_id=resource.skill_id,
        submitted_by_id=resource.submitted_by_id,
        submitted_by_email=resource.submitted_by_user.email if resource.submitted_by_user else None,
        status=resource.status,
        rejection_reason=resource.rejection_reason,
        created_at=resource.created_at.isoformat() if resource.created_at else datetime.now(timezone.utc).isoformat(),
        updated_at=resource.updated_at.isoformat() if resource.updated_at else datetime.now(timezone.utc).isoformat()
    )


@router.post("/admin/resources/{resource_id}/reject", response_model=PlatformResourceItem)
async def reject_resource(
    resource_id: int,
    payload: Optional[ResourceReviewInput] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin rejects a mentor resource submission:
    - Status set to REJECTED
    - Remains excluded from learner queries
    """
    stmt = select(Resource).where(Resource.id == resource_id).options(selectinload(Resource.submitted_by_user))
    resource = (await db.execute(stmt)).scalars().first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
        
    resource.status = "REJECTED"
    resource.rejection_reason = payload.reason.strip() if payload and payload.reason else "Resource did not meet quality standards or guidelines."
    
    await db.commit()
    await db.refresh(resource)
    
    return PlatformResourceItem(
        id=resource.id,
        title=resource.title,
        content=resource.content,
        url=resource.url,
        resource_type=resource.resource_type,
        skill_id=resource.skill_id,
        submitted_by_id=resource.submitted_by_id,
        submitted_by_email=resource.submitted_by_user.email if resource.submitted_by_user else None,
        status=resource.status,
        rejection_reason=resource.rejection_reason,
        created_at=resource.created_at.isoformat() if resource.created_at else datetime.now(timezone.utc).isoformat(),
        updated_at=resource.updated_at.isoformat() if resource.updated_at else datetime.now(timezone.utc).isoformat()
    )
