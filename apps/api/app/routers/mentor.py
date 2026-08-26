"""
Mentor Intervention Hub API Router.

Provides operations control endpoints for human mentors:
- Cohort and placement drive management
- Algorithmic triage queue with Breakthrough Zone detection
- In-depth learner diagnostics and evidence inspection
- Closed-loop mentor intervention lifecycle (Create, Schedule, In Progress, Resolve)
"""
import logging
from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.core.auth import get_current_user, require_active_user, require_approved_mentor, require_admin
from app.models.domain import (
    User,
    LearnerProfile,
    ReadinessSnapshot,
    AssessmentAttempt,
    AssessmentItem,
    CodingSandboxSubmission,
    Cohort,
    CohortMember,
    PlacementDrive,
    MentorIntervention,
    AiCoachEscalation,
)
from app.services.intervention_engine import (
    generate_cohort_triage_queue,
    calculate_learner_velocity,
    detect_and_sync_ai_escalations,
    CohortTriageReport,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/mentor", tags=["Mentor Intervention Hub"])


# ---------------------------------------------------------------------------
# Pydantic Request & Response Schemas
# ---------------------------------------------------------------------------

class CohortItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    institution: Optional[str] = None
    is_active: bool
    active_member_count: int
    active_drive_count: int
    created_at: str

class CohortsListResponse(BaseModel):
    cohorts: List[CohortItem]

class PlacementDriveItem(BaseModel):
    id: int
    cohort_id: Optional[int] = None
    company_name: str
    role_title: str
    target_date: str
    required_skills: List[str]
    readiness_threshold: float
    is_active: bool
    days_remaining: int
    created_at: str

class PlacementDrivesListResponse(BaseModel):
    drives: List[PlacementDriveItem]

class InterventionCreateRequest(BaseModel):
    profile_id: int
    cohort_id: Optional[int] = None
    placement_drive_id: Optional[int] = None
    action_type: str = Field(..., description="TARGETED_1ON1 | ASYNC_REVIEW | AI_ESCALATION_REVIEW | URGENT_INTERVENTION | INDEPENDENT_MONITORING")
    priority: str = Field(default="HIGH", description="CRITICAL | HIGH | MEDIUM | LOW")
    focus_skills: Optional[List[str]] = None
    reason: str
    notes: Optional[str] = None
    status: str = Field(default="PENDING", description="PENDING | SCHEDULED | IN_PROGRESS | RESOLVED | CANCELLED")
    recommended_timing: Optional[str] = None
    duration_minutes: int = 30
    scheduled_at: Optional[datetime] = None

class InterventionUpdateRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    action_type: Optional[str] = None
    priority: Optional[str] = None
    focus_skills: Optional[List[str]] = None
    duration_minutes: Optional[int] = None
    scheduled_at: Optional[datetime] = None

class InterventionResponse(BaseModel):
    id: int
    profile_id: int
    mentor_id: int
    mentor_name: str
    learner_name: str
    cohort_id: Optional[int] = None
    placement_drive_id: Optional[int] = None
    action_type: str
    priority: str
    focus_skills: Optional[List[str]] = None
    reason: str
    notes: Optional[str] = None
    status: str
    recommended_timing: Optional[str] = None
    duration_minutes: int
    scheduled_at: Optional[str] = None
    resolved_at: Optional[str] = None
    created_at: str
    updated_at: str

class InterventionsListResponse(BaseModel):
    interventions: List[InterventionResponse]

class LearnerReadinessItem(BaseModel):
    skill_id: str
    readiness_score: float
    is_mastered: bool
    last_updated: Optional[str] = None

class RecentAssessmentItem(BaseModel):
    id: int
    assessment_item_id: int
    item_title: str
    score: float
    is_correct: bool
    attempted_at: str

class RecentSandboxItem(BaseModel):
    id: int
    node_id: str
    problem_title: Optional[str] = None
    language: str
    score: float
    verdict: str
    is_passing: bool
    thrash_index: Optional[float] = None
    created_at: str

class LearnerEscalationItem(BaseModel):
    id: int
    skill_id: Optional[str] = None
    reason: str
    severity: str
    thrash_index: Optional[float] = None
    source: str
    status: str
    created_at: str
    resolved_at: Optional[str] = None

class LearnerDetailResponse(BaseModel):
    profile_id: int
    user_id: int
    name: str
    email: str
    target_role: str
    velocity: Dict[str, Any]
    readiness_snapshots: List[LearnerReadinessItem]
    recent_assessments: List[RecentAssessmentItem]
    recent_sandbox_submissions: List[RecentSandboxItem]
    ai_escalations: List[LearnerEscalationItem]
    interventions_history: List[InterventionResponse]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/cohorts", response_model=CohortsListResponse)
async def list_cohorts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Lists active cohorts available to the authenticated mentor.
    """
    stmt = (
        select(Cohort)
        .where(Cohort.is_active == True)
        .order_by(Cohort.name)
    )
    cohorts = (await db.execute(stmt)).scalars().all()

    items: List[CohortItem] = []
    for c in cohorts:
        # Count active members
        stmt_m = select(func.count(CohortMember.id)).where(
            CohortMember.cohort_id == c.id,
            CohortMember.is_active == True,
        )
        m_count = (await db.execute(stmt_m)).scalar_one()

        # Count active drives
        stmt_d = select(func.count(PlacementDrive.id)).where(
            PlacementDrive.cohort_id == c.id,
            PlacementDrive.is_active == True,
        )
        d_count = (await db.execute(stmt_d)).scalar_one()

        items.append(CohortItem(
            id=c.id,
            name=c.name,
            description=c.description,
            institution=c.institution,
            is_active=c.is_active,
            active_member_count=m_count,
            active_drive_count=d_count,
            created_at=c.created_at.isoformat() if c.created_at else datetime.now(timezone.utc).isoformat(),
        ))

    return CohortsListResponse(cohorts=items)


@router.get("/cohorts/{cohort_id}/drives", response_model=PlacementDrivesListResponse)
async def list_cohort_drives(
    cohort_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Lists real placement drives linked to a cohort (or shared drives).
    """
    stmt = (
        select(PlacementDrive)
        .where(
            or_(PlacementDrive.cohort_id == cohort_id, PlacementDrive.cohort_id.is_(None)),
            PlacementDrive.is_active == True,
        )
        .order_by(PlacementDrive.target_date)
    )
    drives = (await db.execute(stmt)).scalars().all()

    now = datetime.now(timezone.utc)
    items: List[PlacementDriveItem] = []
    for d in drives:
        try:
            target_dt = datetime.strptime(d.target_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            days_rem = max(0, (target_dt.date() - now.date()).days)
        except Exception:
            days_rem = 30

        items.append(PlacementDriveItem(
            id=d.id,
            cohort_id=d.cohort_id,
            company_name=d.company_name,
            role_title=d.role_title,
            target_date=d.target_date,
            required_skills=d.required_skills if isinstance(d.required_skills, list) else [],
            readiness_threshold=d.readiness_threshold,
            is_active=d.is_active,
            days_remaining=days_rem,
            created_at=d.created_at.isoformat() if d.created_at else now.isoformat(),
        ))

    return PlacementDrivesListResponse(drives=items)


@router.get("/cohorts/{cohort_id}/triage", response_model=CohortTriageReport)
async def get_cohort_triage(
    cohort_id: int,
    placement_drive_id: Optional[int] = Query(None),
    breakthrough_only: bool = Query(False),
    escalations_only: bool = Query(False),
    high_urgency_only: bool = Query(False),
    active_interventions_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Returns the real-time, multi-factor mentor triage queue for a cohort.
    """
    try:
        report = await generate_cohort_triage_queue(
            cohort_id=cohort_id,
            placement_drive_id=placement_drive_id,
            filters={
                "breakthrough_only": breakthrough_only,
                "escalations_only": escalations_only,
                "high_urgency_only": high_urgency_only,
                "active_interventions_only": active_interventions_only,
            },
            db=db,
        )
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Cohort triage calculation error")
        raise HTTPException(status_code=500, detail=f"Cohort triage calculation failed: {e}")


@router.get("/learners/{profile_id}/detail", response_model=LearnerDetailResponse)
async def get_learner_detail(
    profile_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Returns comprehensive diagnostic, readiness, failure telemetry,
    escalation history, and intervention logs for a specific learner.
    """
    stmt = (
        select(LearnerProfile)
        .where(LearnerProfile.id == profile_id)
        .options(
            selectinload(LearnerProfile.user),
            selectinload(LearnerProfile.readiness_snapshots),
        )
    )
    profile = (await db.execute(stmt)).scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail=f"Learner profile #{profile_id} not found.")

    user = profile.user
    name = user.name if user and user.name else f"Learner #{profile.id}"
    email = user.email if user else f"learner_{profile.id}@pathfinder.dev"

    # 1. Sync & Fetch AI Escalations
    await detect_and_sync_ai_escalations(profile.id, db)
    stmt_esc = (
        select(AiCoachEscalation)
        .where(AiCoachEscalation.profile_id == profile.id)
        .order_by(desc(AiCoachEscalation.created_at))
    )
    escalations = (await db.execute(stmt_esc)).scalars().all()

    # 2. Compute Velocity
    velocity_info = await calculate_learner_velocity(profile.id, db)

    # 3. Readiness Snapshots
    readiness_items: List[LearnerReadinessItem] = []
    for s in (profile.readiness_snapshots or []):
        readiness_items.append(LearnerReadinessItem(
            skill_id=s.skill_id,
            readiness_score=round(s.readiness_score, 2),
            is_mastered=s.readiness_score >= 0.70,
            last_updated=s.last_updated.isoformat() if s.last_updated else None,
        ))
    readiness_items.sort(key=lambda r: r.readiness_score)

    # 4. Recent Assessment Attempts
    stmt_att = (
        select(AssessmentAttempt)
        .where(AssessmentAttempt.profile_id == profile.id)
        .options(selectinload(AssessmentAttempt.assessment_item))
        .order_by(desc(AssessmentAttempt.attempted_at))
        .limit(15)
    )
    attempts = (await db.execute(stmt_att)).scalars().all()
    assessment_items: List[RecentAssessmentItem] = []
    for a in attempts:
        item_title = a.assessment_item.title if a.assessment_item else f"Checkpoint #{a.assessment_item_id}"
        assessment_items.append(RecentAssessmentItem(
            id=a.id,
            assessment_item_id=a.assessment_item_id,
            item_title=item_title,
            score=round(a.score, 2),
            is_correct=a.is_correct,
            attempted_at=a.attempted_at.isoformat() if a.attempted_at else "",
        ))

    # 5. Recent Coding Sandbox Submissions
    stmt_sub = (
        select(CodingSandboxSubmission)
        .where(CodingSandboxSubmission.profile_id == profile.id)
        .order_by(desc(CodingSandboxSubmission.created_at))
        .limit(15)
    )
    submissions = (await db.execute(stmt_sub)).scalars().all()
    sandbox_items: List[RecentSandboxItem] = []
    for sub in submissions:
        thrash = None
        if sub.evaluation_result and isinstance(sub.evaluation_result, dict):
            thrash = sub.evaluation_result.get("thrash_index")

        sandbox_items.append(RecentSandboxItem(
            id=sub.id,
            node_id=sub.node_id,
            problem_title=sub.problem_title or sub.node_id,
            language=sub.language,
            score=round(sub.score, 2),
            verdict=sub.verdict,
            is_passing=sub.is_passing,
            thrash_index=float(thrash) if thrash is not None else None,
            created_at=sub.created_at.isoformat() if sub.created_at else "",
        ))

    # 6. Escalation Items
    escalation_items: List[LearnerEscalationItem] = []
    for e in escalations:
        escalation_items.append(LearnerEscalationItem(
            id=e.id,
            skill_id=e.skill_id,
            reason=e.reason,
            severity=e.severity,
            thrash_index=e.thrash_index,
            source=e.source,
            status=e.status,
            created_at=e.created_at.isoformat() if e.created_at else "",
            resolved_at=e.resolved_at.isoformat() if e.resolved_at else None,
        ))

    # 7. Intervention History
    stmt_inter = (
        select(MentorIntervention)
        .where(MentorIntervention.profile_id == profile.id)
        .options(selectinload(MentorIntervention.mentor))
        .order_by(desc(MentorIntervention.created_at))
    )
    interventions = (await db.execute(stmt_inter)).scalars().all()
    intervention_items: List[InterventionResponse] = []
    for i in interventions:
        m_name = i.mentor.name if i.mentor and i.mentor.name else (i.mentor.email if i.mentor else f"Mentor #{i.mentor_id}")
        intervention_items.append(InterventionResponse(
            id=i.id,
            profile_id=i.profile_id,
            mentor_id=i.mentor_id,
            mentor_name=m_name,
            learner_name=name,
            cohort_id=i.cohort_id,
            placement_drive_id=i.placement_drive_id,
            action_type=i.action_type,
            priority=i.priority,
            focus_skills=i.focus_skills if isinstance(i.focus_skills, list) else None,
            reason=i.reason,
            notes=i.notes,
            status=i.status,
            recommended_timing=i.recommended_timing,
            duration_minutes=i.duration_minutes,
            scheduled_at=i.scheduled_at.isoformat() if i.scheduled_at else None,
            resolved_at=i.resolved_at.isoformat() if i.resolved_at else None,
            created_at=i.created_at.isoformat() if i.created_at else "",
            updated_at=i.updated_at.isoformat() if i.updated_at else "",
        ))

    return LearnerDetailResponse(
        profile_id=profile.id,
        user_id=user.id if user else profile.user_id,
        name=name,
        email=email,
        target_role=profile.current_context or "Software Engineer",
        velocity=velocity_info,
        readiness_snapshots=readiness_items,
        recent_assessments=assessment_items,
        recent_sandbox_submissions=sandbox_items,
        ai_escalations=escalation_items,
        interventions_history=intervention_items,
    )


# ---------------------------------------------------------------------------
# Intervention CRUD & Lifecycle Endpoints
# ---------------------------------------------------------------------------

@router.post("/interventions", response_model=InterventionResponse)
async def create_intervention(
    payload: InterventionCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Creates a new mentor intervention record.
    """
    # 1. Validate Profile
    profile = await db.get(LearnerProfile, payload.profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Learner profile #{payload.profile_id} not found.")

    # 2. Validate Allowed Action Types & Priorities
    valid_actions = {"TARGETED_1ON1", "ASYNC_REVIEW", "AI_ESCALATION_REVIEW", "URGENT_INTERVENTION", "INDEPENDENT_MONITORING"}
    if payload.action_type not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action_type '{payload.action_type}'. Must be one of {valid_actions}")

    valid_statuses = {"PENDING", "SCHEDULED", "IN_PROGRESS", "RESOLVED", "CANCELLED"}
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{payload.status}'. Must be one of {valid_statuses}")

    now = datetime.now(timezone.utc)
    resolved_at = now if payload.status == "RESOLVED" else None

    intervention = MentorIntervention(
        profile_id=payload.profile_id,
        mentor_id=current_user.id,
        cohort_id=payload.cohort_id,
        placement_drive_id=payload.placement_drive_id,
        action_type=payload.action_type,
        priority=payload.priority,
        focus_skills=payload.focus_skills,
        reason=payload.reason,
        notes=payload.notes,
        status=payload.status,
        recommended_timing=payload.recommended_timing,
        duration_minutes=payload.duration_minutes,
        scheduled_at=payload.scheduled_at,
        resolved_at=resolved_at,
    )

    db.add(intervention)
    await db.commit()
    await db.refresh(intervention)

    # Fetch learner user name
    stmt_user = select(User).join(LearnerProfile, LearnerProfile.user_id == User.id).where(LearnerProfile.id == payload.profile_id)
    learner_user = (await db.execute(stmt_user)).scalars().first()
    learner_name = learner_user.name if learner_user and learner_user.name else f"Learner #{payload.profile_id}"

    mentor_name = current_user.name or current_user.email

    return InterventionResponse(
        id=intervention.id,
        profile_id=intervention.profile_id,
        mentor_id=intervention.mentor_id,
        mentor_name=mentor_name,
        learner_name=learner_name,
        cohort_id=intervention.cohort_id,
        placement_drive_id=intervention.placement_drive_id,
        action_type=intervention.action_type,
        priority=intervention.priority,
        focus_skills=intervention.focus_skills if isinstance(intervention.focus_skills, list) else None,
        reason=intervention.reason,
        notes=intervention.notes,
        status=intervention.status,
        recommended_timing=intervention.recommended_timing,
        duration_minutes=intervention.duration_minutes,
        scheduled_at=intervention.scheduled_at.isoformat() if intervention.scheduled_at else None,
        resolved_at=intervention.resolved_at.isoformat() if intervention.resolved_at else None,
        created_at=intervention.created_at.isoformat() if intervention.created_at else now.isoformat(),
        updated_at=intervention.updated_at.isoformat() if intervention.updated_at else now.isoformat(),
    )


@router.get("/interventions", response_model=InterventionsListResponse)
async def list_interventions(
    cohort_id: Optional[int] = Query(None),
    profile_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Lists recorded mentor interventions with optional filtering.
    """
    query = (
        select(MentorIntervention)
        .options(
            selectinload(MentorIntervention.mentor),
            selectinload(MentorIntervention.profile).selectinload(LearnerProfile.user),
        )
        .order_by(desc(MentorIntervention.created_at))
    )

    if cohort_id:
        query = query.where(MentorIntervention.cohort_id == cohort_id)
    if profile_id:
        query = query.where(MentorIntervention.profile_id == profile_id)
    if status_filter:
        query = query.where(MentorIntervention.status == status_filter)

    results = (await db.execute(query)).scalars().all()

    items: List[InterventionResponse] = []
    for i in results:
        m_name = i.mentor.name if i.mentor and i.mentor.name else (i.mentor.email if i.mentor else f"Mentor #{i.mentor_id}")
        l_user = i.profile.user if i.profile and i.profile.user else None
        l_name = l_user.name if l_user and l_user.name else f"Learner #{i.profile_id}"

        items.append(InterventionResponse(
            id=i.id,
            profile_id=i.profile_id,
            mentor_id=i.mentor_id,
            mentor_name=m_name,
            learner_name=l_name,
            cohort_id=i.cohort_id,
            placement_drive_id=i.placement_drive_id,
            action_type=i.action_type,
            priority=i.priority,
            focus_skills=i.focus_skills if isinstance(i.focus_skills, list) else None,
            reason=i.reason,
            notes=i.notes,
            status=i.status,
            recommended_timing=i.recommended_timing,
            duration_minutes=i.duration_minutes,
            scheduled_at=i.scheduled_at.isoformat() if i.scheduled_at else None,
            resolved_at=i.resolved_at.isoformat() if i.resolved_at else None,
            created_at=i.created_at.isoformat() if i.created_at else "",
            updated_at=i.updated_at.isoformat() if i.updated_at else "",
        ))

    return InterventionsListResponse(interventions=items)


@router.get("/interventions/{intervention_id}", response_model=InterventionResponse)
async def get_intervention_detail(
    intervention_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Retrieves a single intervention by ID.
    """
    stmt = (
        select(MentorIntervention)
        .where(MentorIntervention.id == intervention_id)
        .options(
            selectinload(MentorIntervention.mentor),
            selectinload(MentorIntervention.profile).selectinload(LearnerProfile.user),
        )
    )
    i = (await db.execute(stmt)).scalars().first()
    if not i:
        raise HTTPException(status_code=404, detail=f"Intervention #{intervention_id} not found.")

    m_name = i.mentor.name if i.mentor and i.mentor.name else (i.mentor.email if i.mentor else f"Mentor #{i.mentor_id}")
    l_user = i.profile.user if i.profile and i.profile.user else None
    l_name = l_user.name if l_user and l_user.name else f"Learner #{i.profile_id}"

    return InterventionResponse(
        id=i.id,
        profile_id=i.profile_id,
        mentor_id=i.mentor_id,
        mentor_name=m_name,
        learner_name=l_name,
        cohort_id=i.cohort_id,
        placement_drive_id=i.placement_drive_id,
        action_type=i.action_type,
        priority=i.priority,
        focus_skills=i.focus_skills if isinstance(i.focus_skills, list) else None,
        reason=i.reason,
        notes=i.notes,
        status=i.status,
        recommended_timing=i.recommended_timing,
        duration_minutes=i.duration_minutes,
        scheduled_at=i.scheduled_at.isoformat() if i.scheduled_at else None,
        resolved_at=i.resolved_at.isoformat() if i.resolved_at else None,
        created_at=i.created_at.isoformat() if i.created_at else "",
        updated_at=i.updated_at.isoformat() if i.updated_at else "",
    )


@router.patch("/interventions/{intervention_id}", response_model=InterventionResponse)
async def update_intervention(
    intervention_id: int,
    payload: InterventionUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_approved_mentor),
):
    """
    Updates intervention status, notes, or scheduling parameters with lifecycle validation.
    """
    stmt = (
        select(MentorIntervention)
        .where(MentorIntervention.id == intervention_id)
        .options(
            selectinload(MentorIntervention.mentor),
            selectinload(MentorIntervention.profile).selectinload(LearnerProfile.user),
        )
    )
    i = (await db.execute(stmt)).scalars().first()
    if not i:
        raise HTTPException(status_code=404, detail=f"Intervention #{intervention_id} not found.")

    now = datetime.now(timezone.utc)

    # Lifecycle state transition checks
    if payload.status is not None:
        valid_statuses = {"PENDING", "SCHEDULED", "IN_PROGRESS", "RESOLVED", "CANCELLED"}
        if payload.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status '{payload.status}'. Must be one of {valid_statuses}")

        # Terminal state protection
        if i.status in ("RESOLVED", "CANCELLED") and payload.status not in (i.status, "RESOLVED", "CANCELLED"):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot transition intervention from terminal status '{i.status}' to '{payload.status}'"
            )

        if payload.status == "RESOLVED" and i.status != "RESOLVED":
            i.resolved_at = now
        elif payload.status != "RESOLVED":
            i.resolved_at = None

        if payload.status == "SCHEDULED" and payload.scheduled_at:
            i.scheduled_at = payload.scheduled_at

        i.status = payload.status

    if payload.notes is not None:
        i.notes = payload.notes
    if payload.action_type is not None:
        i.action_type = payload.action_type
    if payload.priority is not None:
        i.priority = payload.priority
    if payload.focus_skills is not None:
        i.focus_skills = payload.focus_skills
    if payload.duration_minutes is not None:
        i.duration_minutes = payload.duration_minutes
    if payload.scheduled_at is not None:
        i.scheduled_at = payload.scheduled_at

    await db.commit()
    await db.refresh(i)

    m_name = i.mentor.name if i.mentor and i.mentor.name else (i.mentor.email if i.mentor else f"Mentor #{i.mentor_id}")
    l_user = i.profile.user if i.profile and i.profile.user else None
    l_name = l_user.name if l_user and l_user.name else f"Learner #{i.profile_id}"

    return InterventionResponse(
        id=i.id,
        profile_id=i.profile_id,
        mentor_id=i.mentor_id,
        mentor_name=m_name,
        learner_name=l_name,
        cohort_id=i.cohort_id,
        placement_drive_id=i.placement_drive_id,
        action_type=i.action_type,
        priority=i.priority,
        focus_skills=i.focus_skills if isinstance(i.focus_skills, list) else None,
        reason=i.reason,
        notes=i.notes,
        status=i.status,
        recommended_timing=i.recommended_timing,
        duration_minutes=i.duration_minutes,
        scheduled_at=i.scheduled_at.isoformat() if i.scheduled_at else None,
        resolved_at=i.resolved_at.isoformat() if i.resolved_at else None,
        created_at=i.created_at.isoformat() if i.created_at else "",
        updated_at=i.updated_at.isoformat() if i.updated_at else "",
    )
