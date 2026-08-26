"""
Mentor Connect Router.

Provides learner-initiated human mentor escalation, atomic first-come-first-served (FCFS)
session acceptance, lifecycle scheduling, embedded Jitsi video meeting room provisioning,
and post-session mentor recommendation tracking.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, desc, or_, and_
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.auth import (
    get_current_user,
    require_active_user,
    require_learner,
    require_approved_mentor,
    require_mentor,
    require_admin,
    normalize_role,
    UserRole,
)
from app.models.domain import (
    User,
    LearnerProfile,
    ReadinessSnapshot,
    MentorSessionRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/mentor-connect", tags=["Mentor Connect"])

ALLOWED_DURATIONS = {15, 30, 45, 60}


# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------

class CreateSessionRequestBody(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    reason: str = Field(..., min_length=5)
    skill_id: Optional[str] = None
    requested_duration_minutes: int = Field(default=30)

    @field_validator("requested_duration_minutes")
    @classmethod
    def validate_duration(cls, v: int) -> int:
        if v not in ALLOWED_DURATIONS:
            raise ValueError(f"Duration must be one of {sorted(ALLOWED_DURATIONS)} minutes.")
        return v

class ScheduleSessionBody(BaseModel):
    scheduled_at: datetime
    duration_minutes: int = Field(default=30)

    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, v: int) -> int:
        if v not in ALLOWED_DURATIONS:
            raise ValueError(f"Duration must be one of {sorted(ALLOWED_DURATIONS)} minutes.")
        return v

class CompleteSessionBody(BaseModel):
    mentor_notes: str = Field(..., min_length=5)
    recommendations: Optional[str] = None

class SessionRequestItem(BaseModel):
    id: int
    profile_id: int
    learner_name: str
    learner_email: str
    target_role: Optional[str] = None
    mentor_id: Optional[int] = None
    mentor_name: Optional[str] = None
    mentor_email: Optional[str] = None
    skill_id: Optional[str] = None
    skill_readiness_pct: Optional[float] = None
    title: str
    description: str
    reason: str
    status: str
    requested_duration_minutes: int
    duration_minutes: int
    accepted_at: Optional[str] = None
    scheduled_at: Optional[str] = None
    meeting_room_id: Optional[str] = None
    meeting_url: Optional[str] = None
    mentor_notes: Optional[str] = None
    recommendations: Optional[str] = None
    completed_at: Optional[str] = None
    cancelled_at: Optional[str] = None
    created_at: str
    updated_at: str

class OpenRequestsListResponse(BaseModel):
    requests: List[SessionRequestItem]

class MyRequestsListResponse(BaseModel):
    requests: List[SessionRequestItem]

class MentorSessionsListResponse(BaseModel):
    sessions: List[SessionRequestItem]


# ---------------------------------------------------------------------------
# Helper: Serialization
# ---------------------------------------------------------------------------

async def _serialize_session_request(
    req: MentorSessionRequest,
    db: AsyncSession,
    include_meeting_details: bool = False,
) -> SessionRequestItem:
    # 1. Fetch learner user info
    learner_user = req.profile.user if req.profile and req.profile.user else None
    if not learner_user and req.profile_id:
        stmt_prof = select(LearnerProfile).options(selectinload(LearnerProfile.user)).where(LearnerProfile.id == req.profile_id)
        prof_res = (await db.execute(stmt_prof)).scalars().first()
        if prof_res:
            learner_user = prof_res.user

    learner_name = learner_user.name if learner_user and learner_user.name else f"Learner #{req.profile_id}"
    learner_email = learner_user.email if learner_user else ""
    target_role = req.profile.current_context if req.profile else None

    # 2. Fetch mentor user info
    mentor_name = None
    mentor_email = None
    if req.mentor_id:
        mentor_user = req.mentor if req.mentor else await db.get(User, req.mentor_id)
        if mentor_user:
            mentor_name = mentor_user.name or mentor_user.email
            mentor_email = mentor_user.email

    # 3. Fetch skill readiness context if skill_id is present
    skill_readiness_pct = None
    if req.skill_id and req.profile_id:
        stmt_snap = select(ReadinessSnapshot).where(
            ReadinessSnapshot.profile_id == req.profile_id,
            ReadinessSnapshot.skill_id == req.skill_id,
        )
        snap = (await db.execute(stmt_snap)).scalars().first()
        if snap:
            skill_readiness_pct = round(snap.readiness_score * 100, 1)

    return SessionRequestItem(
        id=req.id,
        profile_id=req.profile_id,
        learner_name=learner_name,
        learner_email=learner_email,
        target_role=target_role,
        mentor_id=req.mentor_id,
        mentor_name=mentor_name,
        mentor_email=mentor_email,
        skill_id=req.skill_id,
        skill_readiness_pct=skill_readiness_pct,
        title=req.title,
        description=req.description,
        reason=req.reason,
        status=req.status,
        requested_duration_minutes=req.requested_duration_minutes,
        duration_minutes=req.duration_minutes,
        accepted_at=req.accepted_at.isoformat() if req.accepted_at else None,
        scheduled_at=req.scheduled_at.isoformat() if req.scheduled_at else None,
        meeting_room_id=req.meeting_room_id if include_meeting_details else None,
        meeting_url=req.meeting_url if include_meeting_details else None,
        mentor_notes=req.mentor_notes,
        recommendations=req.recommendations,
        completed_at=req.completed_at.isoformat() if req.completed_at else None,
        cancelled_at=req.cancelled_at.isoformat() if req.cancelled_at else None,
        created_at=req.created_at.isoformat() if req.created_at else datetime.now(timezone.utc).isoformat(),
        updated_at=req.updated_at.isoformat() if req.updated_at else datetime.now(timezone.utc).isoformat(),
    )


async def _get_or_create_learner_profile(user: User, db: AsyncSession) -> LearnerProfile:
    stmt = select(LearnerProfile).where(LearnerProfile.user_id == user.id)
    profile = (await db.execute(stmt)).scalars().first()
    if not profile:
        profile = LearnerProfile(user_id=user.id, current_context="Software Engineering Track")
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


# ---------------------------------------------------------------------------
# Learner Endpoints
# ---------------------------------------------------------------------------

@router.post("/requests", response_model=SessionRequestItem)
async def create_session_request(
    payload: CreateSessionRequestBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_learner),
):
    """
    Learner requests a 1-on-1 human mentor session.
    Profile ID is strictly derived from the authenticated user.
    Prevents duplicate active OPEN requests for the same skill/topic.
    """
    profile = await _get_or_create_learner_profile(current_user, db)

    # Duplicate OPEN request protection
    stmt_dup = select(MentorSessionRequest).where(
        MentorSessionRequest.profile_id == profile.id,
        MentorSessionRequest.status == "OPEN",
        or_(
            and_(MentorSessionRequest.skill_id.isnot(None), MentorSessionRequest.skill_id == payload.skill_id),
            MentorSessionRequest.title == payload.title,
        )
    )
    existing_open = (await db.execute(stmt_dup)).scalars().first()
    if existing_open:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You already have an active open mentor request for '{existing_open.title}'. Please wait for a mentor to accept or cancel it before submitting another."
        )

    req = MentorSessionRequest(
        profile_id=profile.id,
        skill_id=payload.skill_id.strip() if payload.skill_id else None,
        title=payload.title.strip(),
        description=payload.description.strip(),
        reason=payload.reason.strip(),
        status="OPEN",
        requested_duration_minutes=payload.requested_duration_minutes,
        duration_minutes=payload.requested_duration_minutes,
    )

    db.add(req)
    await db.commit()
    await db.refresh(req)

    return await _serialize_session_request(req, db, include_meeting_details=False)


@router.get("/my-requests", response_model=MyRequestsListResponse)
async def get_my_session_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_learner),
):
    """
    Learner retrieves all their requested mentor sessions with meeting URLs if scheduled.
    """
    profile = await _get_or_create_learner_profile(current_user, db)

    stmt = (
        select(MentorSessionRequest)
        .where(MentorSessionRequest.profile_id == profile.id)
        .options(
            selectinload(MentorSessionRequest.profile).selectinload(LearnerProfile.user),
            selectinload(MentorSessionRequest.mentor),
        )
        .order_by(desc(MentorSessionRequest.created_at))
    )
    results = (await db.execute(stmt)).scalars().all()

    items = [
        await _serialize_session_request(r, db, include_meeting_details=r.status in ("SCHEDULED", "IN_PROGRESS", "COMPLETED"))
        for r in results
    ]
    return MyRequestsListResponse(requests=items)


@router.post("/requests/{request_id}/cancel", response_model=SessionRequestItem)
async def cancel_session_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    """
    Learner cancels their own pending or scheduled request.
    """
    profile = await _get_or_create_learner_profile(current_user, db)

    stmt = (
        select(MentorSessionRequest)
        .where(MentorSessionRequest.id == request_id)
        .options(
            selectinload(MentorSessionRequest.profile).selectinload(LearnerProfile.user),
            selectinload(MentorSessionRequest.mentor),
        )
    )
    req = (await db.execute(stmt)).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Session request not found.")

    # IDOR Check
    if req.profile_id != profile.id and normalize_role(current_user.role) != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="You are not authorized to cancel another learner's session request.")

    # Lifecycle validation
    if req.status in ("COMPLETED", "CANCELLED"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel a session in terminal status '{req.status}'.")

    req.status = "CANCELLED"
    req.cancelled_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(req)

    return await _serialize_session_request(req, db, include_meeting_details=False)


# ---------------------------------------------------------------------------
# Mentor Endpoints
# ---------------------------------------------------------------------------

@router.get("/open-requests", response_model=OpenRequestsListResponse)
async def list_open_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Approved mentors view all unassigned OPEN session requests across learners.
    """
    stmt = (
        select(MentorSessionRequest)
        .where(MentorSessionRequest.status == "OPEN")
        .options(
            selectinload(MentorSessionRequest.profile).selectinload(LearnerProfile.user),
        )
        .order_by(desc(MentorSessionRequest.created_at))
    )
    results = (await db.execute(stmt)).scalars().all()

    items = [
        await _serialize_session_request(r, db, include_meeting_details=False)
        for r in results
    ]
    return OpenRequestsListResponse(requests=items)


@router.post("/requests/{request_id}/accept", response_model=SessionRequestItem)
async def accept_session_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Atomic First-Come-First-Served (FCFS) session acceptance.
    Database-level conditional update guarantees exactly ONE mentor wins.
    Simultaneous competitors receive HTTP 409 Conflict.
    """
    now = datetime.now(timezone.utc)

    stmt_update = (
        update(MentorSessionRequest)
        .where(
            MentorSessionRequest.id == request_id,
            MentorSessionRequest.status == "OPEN",
        )
        .values(
            status="ACCEPTED",
            mentor_id=current_user.id,
            accepted_at=now,
        )
    )
    result = await db.execute(stmt_update)
    await db.commit()

    if result.rowcount == 0:
        # Check if request exists or was taken by another mentor
        req_check = await db.get(MentorSessionRequest, request_id)
        if not req_check:
            raise HTTPException(status_code=404, detail="Session request not found.")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This request was just accepted by another mentor."
        )

    # Fetch updated entity
    stmt = (
        select(MentorSessionRequest)
        .where(MentorSessionRequest.id == request_id)
        .options(
            selectinload(MentorSessionRequest.profile).selectinload(LearnerProfile.user),
            selectinload(MentorSessionRequest.mentor),
        )
    )
    req = (await db.execute(stmt)).scalars().first()
    return await _serialize_session_request(req, db, include_meeting_details=False)


@router.post("/requests/{request_id}/schedule", response_model=SessionRequestItem)
async def schedule_session(
    request_id: int,
    payload: ScheduleSessionBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Assigned mentor schedules the session date/time and duration.
    Provisions a secure, unique Jitsi meeting room identifier.
    Strictly enforces mentor ownership (IDOR protection).
    """
    stmt = (
        select(MentorSessionRequest)
        .where(MentorSessionRequest.id == request_id)
        .options(
            selectinload(MentorSessionRequest.profile).selectinload(LearnerProfile.user),
            selectinload(MentorSessionRequest.mentor),
        )
    )
    req = (await db.execute(stmt)).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Session request not found.")

    # Strict Mentor Ownership IDOR Check
    if req.mentor_id != current_user.id and normalize_role(current_user.role) != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to schedule a session assigned to another mentor."
        )

    if req.status not in ("ACCEPTED", "SCHEDULED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot schedule a session with status '{req.status}'. Must be ACCEPTED."
        )

    # Generate secure Jitsi room if not already generated
    if not req.meeting_room_id:
        room_id = f"aven-connect-{uuid.uuid4().hex[:12]}"
        req.meeting_room_id = room_id
        req.meeting_url = f"https://meet.jit.si/{room_id}"

    req.scheduled_at = payload.scheduled_at
    req.duration_minutes = payload.duration_minutes
    req.status = "SCHEDULED"

    await db.commit()
    await db.refresh(req)

    return await _serialize_session_request(req, db, include_meeting_details=True)


@router.get("/mentor-sessions", response_model=MentorSessionsListResponse)
async def list_mentor_sessions(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Mentor lists sessions assigned to themselves across ACCEPTED, SCHEDULED, IN_PROGRESS, and COMPLETED.
    """
    query = (
        select(MentorSessionRequest)
        .where(MentorSessionRequest.mentor_id == current_user.id)
        .options(
            selectinload(MentorSessionRequest.profile).selectinload(LearnerProfile.user),
            selectinload(MentorSessionRequest.mentor),
        )
        .order_by(desc(MentorSessionRequest.created_at))
    )

    if status_filter:
        query = query.where(MentorSessionRequest.status == status_filter)

    results = (await db.execute(query)).scalars().all()

    items = [
        await _serialize_session_request(r, db, include_meeting_details=r.status in ("SCHEDULED", "IN_PROGRESS", "COMPLETED"))
        for r in results
    ]
    return MentorSessionsListResponse(sessions=items)


@router.post("/requests/{request_id}/start", response_model=SessionRequestItem)
async def start_session(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Assigned mentor marks the session as IN_PROGRESS when joining.
    """
    stmt = (
        select(MentorSessionRequest)
        .where(MentorSessionRequest.id == request_id)
        .options(
            selectinload(MentorSessionRequest.profile).selectinload(LearnerProfile.user),
            selectinload(MentorSessionRequest.mentor),
        )
    )
    req = (await db.execute(stmt)).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Session request not found.")

    if req.mentor_id != current_user.id and normalize_role(current_user.role) != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="You are not authorized to start another mentor's session.")

    if req.status not in ("SCHEDULED", "IN_PROGRESS"):
        raise HTTPException(status_code=400, detail=f"Cannot start a session from status '{req.status}'.")

    req.status = "IN_PROGRESS"
    await db.commit()
    await db.refresh(req)

    return await _serialize_session_request(req, db, include_meeting_details=True)


@router.post("/requests/{request_id}/complete", response_model=SessionRequestItem)
async def complete_session(
    request_id: int,
    payload: CompleteSessionBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Assigned mentor marks the session COMPLETED and logs takeaways, notes, and recommendations.
    Strictly enforces mentor ownership (IDOR protection).
    """
    stmt = (
        select(MentorSessionRequest)
        .where(MentorSessionRequest.id == request_id)
        .options(
            selectinload(MentorSessionRequest.profile).selectinload(LearnerProfile.user),
            selectinload(MentorSessionRequest.mentor),
        )
    )
    req = (await db.execute(stmt)).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Session request not found.")

    # Strict IDOR check
    if req.mentor_id != current_user.id and normalize_role(current_user.role) != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="You cannot complete a session assigned to another mentor.")

    if req.status not in ("SCHEDULED", "IN_PROGRESS"):
        raise HTTPException(status_code=400, detail=f"Cannot complete session from status '{req.status}'. Must be SCHEDULED or IN_PROGRESS.")

    req.status = "COMPLETED"
    req.mentor_notes = payload.mentor_notes.strip()
    req.recommendations = payload.recommendations.strip() if payload.recommendations else None
    req.completed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(req)

    return await _serialize_session_request(req, db, include_meeting_details=True)


@router.get("/requests/{request_id}", response_model=SessionRequestItem)
async def get_session_request_detail(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_active_user),
):
    """
    Retrieves full details of a session request.
    Strictly verifies that the caller is the owning learner, assigned mentor, or admin (IDOR protection).
    """
    stmt = (
        select(MentorSessionRequest)
        .where(MentorSessionRequest.id == request_id)
        .options(
            selectinload(MentorSessionRequest.profile).selectinload(LearnerProfile.user),
            selectinload(MentorSessionRequest.mentor),
        )
    )
    req = (await db.execute(stmt)).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Session request not found.")

    # Authorization Check
    user_role = normalize_role(current_user.role)
    is_owner_learner = (req.profile and req.profile.user_id == current_user.id)
    is_assigned_mentor = (req.mentor_id == current_user.id)
    is_admin = (user_role == UserRole.ADMIN.value)

    # If it's an OPEN request and the caller is an approved mentor, allow viewing
    is_open_and_mentor = (req.status == "OPEN" and user_role in (UserRole.MENTOR.value, UserRole.ADMIN.value))

    if not (is_owner_learner or is_assigned_mentor or is_admin or is_open_and_mentor):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this session request.")

    include_meeting = (is_owner_learner or is_assigned_mentor or is_admin) and (req.status in ("SCHEDULED", "IN_PROGRESS", "COMPLETED"))
    return await _serialize_session_request(req, db, include_meeting_details=include_meeting)
