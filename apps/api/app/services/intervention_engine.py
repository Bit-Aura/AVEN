"""
Intervention Engine — Operations & Triage Control Center Service.

Implements:
1. Empirical velocity estimation (with graceful low-history fallback).
2. Idempotent AI Coach struggle & debugging thrash escalation detection.
3. Multi-factor cohort triage queue generation with Breakthrough Zone detection (80–95%),
   drive-specific skill weighting, deadline urgency factors, and structured prescriptive actions.
"""
import logging
import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.domain import (
    User,
    LearnerProfile,
    ReadinessSnapshot,
    AssessmentAttempt,
    AssessmentItem,
    CodingSandboxSubmission,
    DiagnosticTurn,
    Cohort,
    CohortMember,
    PlacementDrive,
    MentorIntervention,
    AiCoachEscalation,
)

logger = logging.getLogger(__name__)

DEFAULT_WEEKLY_HOURS = 10.0
DEFAULT_SKILL_HOURS = 5.0
DEFAULT_READINESS_THRESHOLD = 0.70


# ---------------------------------------------------------------------------
# Pydantic Schemas for Triage & Interventions
# ---------------------------------------------------------------------------

class BlockingSkillItem(BaseModel):
    skill: str
    readiness_score: float

class EscalationItem(BaseModel):
    id: int
    skill_id: Optional[str] = None
    reason: str
    severity: str
    thrash_index: Optional[float] = None
    source: str
    status: str
    created_at: str

class PrescriptiveAction(BaseModel):
    action_type: str  # TARGETED_1ON1 | AI_ESCALATION_REVIEW | ASYNC_REVIEW | URGENT_INTERVENTION | INDEPENDENT_MONITORING
    priority: str     # CRITICAL | HIGH | MEDIUM | LOW
    duration_minutes: int
    focus_skills: List[str]
    reason: str
    recommended_timing: str  # WITHIN_24_HOURS | WITHIN_48_HOURS | THIS_WEEK | MONITOR_WEEKLY

class DriveUrgencyInfo(BaseModel):
    days_until_drive: Optional[int] = None
    estimated_days_needed: Optional[int] = None
    urgency_score: float
    on_track: bool
    target_velocity_hours_per_week: float

class ActiveInterventionSummary(BaseModel):
    id: int
    action_type: str
    status: str
    scheduled_at: Optional[str] = None
    mentor_name: Optional[str] = None

class TriageScoreBreakdown(BaseModel):
    readiness_component: float
    breakthrough_bonus: float
    urgency_component: float
    escalation_component: float
    active_intervention_adjustment: float
    final_triage_score: float

class CohortTriageLearnerItem(BaseModel):
    profile_id: int
    user_id: int
    learner_name: str
    learner_email: str
    target_role: str
    readiness_pct: float
    relevant_readiness_score: float
    triage_score: float
    priority: str  # CRITICAL | HIGH | MEDIUM | LOW
    in_breakthrough_zone: bool
    blocking_skills: List[BlockingSkillItem]
    gap_skills_count: int
    drive_urgency: DriveUrgencyInfo
    active_escalations: List[EscalationItem]
    active_intervention: Optional[ActiveInterventionSummary] = None
    recommended_action: PrescriptiveAction
    score_breakdown: TriageScoreBreakdown

class CohortTriageSummary(BaseModel):
    total_learners: int
    breakthrough_candidates: int
    active_escalations: int
    high_critical_priority: int
    average_readiness_pct: float

class CohortPlacementDriveSummary(BaseModel):
    id: int
    company_name: str
    role_title: str
    target_date: str
    required_skills: List[str]
    days_remaining: int

class CohortTriageReport(BaseModel):
    cohort_id: int
    cohort_name: str
    placement_drive: Optional[CohortPlacementDriveSummary] = None
    summary: CohortTriageSummary
    items: List[CohortTriageLearnerItem]
    generated_at: str


# ---------------------------------------------------------------------------
# 1. Empirical Learner Velocity Calculation
# ---------------------------------------------------------------------------

async def calculate_learner_velocity(
    profile_id: int,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Computes empirical study velocity based on real assessment attempts,
    coding sandbox executions, and diagnostic activity timestamps.
    """
    now = datetime.now(timezone.utc)
    lookback_start = now - timedelta(days=30)

    # 1. Fetch timestamp events from assessment attempts
    stmt_attempts = select(AssessmentAttempt.attempted_at).where(
        AssessmentAttempt.profile_id == profile_id,
        AssessmentAttempt.attempted_at >= lookback_start,
    )
    attempt_times = (await db.execute(stmt_attempts)).scalars().all()

    # 2. Fetch timestamps from coding submissions
    stmt_coding = select(CodingSandboxSubmission.created_at).where(
        CodingSandboxSubmission.profile_id == profile_id,
        CodingSandboxSubmission.created_at >= lookback_start,
    )
    coding_times = (await db.execute(stmt_coding)).scalars().all()

    all_times = [t for t in (attempt_times + coding_times) if t is not None]

    if not all_times or len(all_times) < 2:
        return {
            "velocity_hours_per_week": DEFAULT_WEEKLY_HOURS,
            "confidence": "ESTIMATED",
            "active_days_last_30": 0,
            "total_activity_events": len(all_times),
            "note": "Default velocity applied (insufficient activity history)",
        }

    # Group timestamps into unique active calendar days
    active_days = len({t.date() for t in all_times})
    min_date = min(t.date() for t in all_times)
    max_date = max(t.date() for t in all_times)
    days_span = max(1, (max_date - min_date).days + 1)
    weeks_span = max(1.0, days_span / 7.0)

    # Each distinct active day represents ~1.5 hours of dedicated practice, plus 0.25 hr per submission
    estimated_total_hours = (active_days * 1.5) + (len(all_times) * 0.25)
    weekly_velocity = round(min(50.0, max(2.0, estimated_total_hours / weeks_span)), 1)

    confidence = "HIGH" if active_days >= 6 and len(all_times) >= 8 else "MEDIUM"

    return {
        "velocity_hours_per_week": weekly_velocity,
        "confidence": confidence,
        "active_days_last_30": active_days,
        "total_activity_events": len(all_times),
        "note": f"Empirical velocity derived from {len(all_times)} activities across {active_days} active days",
    }


# ---------------------------------------------------------------------------
# 2. Idempotent AI Coach Escalation Detector
# ---------------------------------------------------------------------------

async def detect_and_sync_ai_escalations(
    profile_id: int,
    db: AsyncSession,
) -> List[AiCoachEscalation]:
    """
    Scans real learner struggle signals (repeated assessment failures,
    consecutive coding failures, high debugging thrash) and idempotently
    records/retrieves active AI Coach Escalations.
    """
    # 1. Fetch currently open escalations
    stmt_open = select(AiCoachEscalation).where(
        AiCoachEscalation.profile_id == profile_id,
        AiCoachEscalation.status.in_(["OPEN", "IN_REVIEW"]),
    )
    existing_open = (await db.execute(stmt_open)).scalars().all()
    open_reasons = {e.reason for e in existing_open}
    open_skills = {e.skill_id for e in existing_open if e.skill_id}

    new_escalations: List[AiCoachEscalation] = []

    # Signal A: Repeated Assessment Failures on the same assessment item or concept
    stmt_fails = (
        select(AssessmentAttempt.assessment_item_id, func.count(AssessmentAttempt.id))
        .where(
            AssessmentAttempt.profile_id == profile_id,
            AssessmentAttempt.is_correct == False,
        )
        .group_by(AssessmentAttempt.assessment_item_id)
        .having(func.count(AssessmentAttempt.id) >= 2)
    )
    repeated_fails = (await db.execute(stmt_fails)).all()

    for item_id, fail_count in repeated_fails:
        item = await db.get(AssessmentItem, item_id)
        item_title = item.title if item else f"Item #{item_id}"
        reason = f"Repeated assessment checkpoint failures ({fail_count}x) on '{item_title}'"
        if reason not in open_reasons:
            esc = AiCoachEscalation(
                profile_id=profile_id,
                skill_id=item_title.lower().replace(" ", "_"),
                reason=reason,
                severity="HIGH",
                source="ASSESSMENT_FAILURES",
                status="OPEN",
            )
            db.add(esc)
            new_escalations.append(esc)
            open_reasons.add(reason)

    # Signal B: High Debugging Thrash from Sandbox Telemetry
    stmt_sandbox = (
        select(CodingSandboxSubmission)
        .where(CodingSandboxSubmission.profile_id == profile_id)
        .order_by(desc(CodingSandboxSubmission.created_at))
        .limit(10)
    )
    recent_submissions = (await db.execute(stmt_sandbox)).scalars().all()

    # Check for consecutive failed coding challenges
    failed_by_node: Dict[str, int] = {}
    for sub in recent_submissions:
        if not sub.is_passing:
            failed_by_node[sub.node_id] = failed_by_node.get(sub.node_id, 0) + 1

    for node_id, fails in failed_by_node.items():
        if fails >= 2:
            reason = f"Multiple failed coding sandbox solutions ({fails}x) on challenge '{node_id}'"
            if reason not in open_reasons:
                esc = AiCoachEscalation(
                    profile_id=profile_id,
                    skill_id=node_id,
                    reason=reason,
                    severity="HIGH",
                    source="SANDBOX_FAILURES",
                    status="OPEN",
                )
                db.add(esc)
                new_escalations.append(esc)
                open_reasons.add(reason)

    # Check for high thrash index evaluations (> 0.65)
    for sub in recent_submissions:
        if sub.evaluation_result and isinstance(sub.evaluation_result, dict):
            thrash_val = sub.evaluation_result.get("thrash_index")
            if thrash_val is not None and isinstance(thrash_val, (int, float)) and thrash_val > 0.65:
                reason = f"High debugging thrash (T_i={thrash_val:.2f}) on '{sub.node_id}' — random edits without hypothesis isolation"
                if reason not in open_reasons and sub.node_id not in open_skills:
                    esc = AiCoachEscalation(
                        profile_id=profile_id,
                        skill_id=sub.node_id,
                        reason=reason,
                        severity="CRITICAL",
                        thrash_index=float(thrash_val),
                        source="DEBUG_THRASH",
                        status="OPEN",
                    )
                    db.add(esc)
                    new_escalations.append(esc)
                    open_reasons.add(reason)

    if new_escalations:
        await db.commit()
        for e in new_escalations:
            await db.refresh(e)

    # Return refreshed complete list of open/in-review escalations
    stmt_final = select(AiCoachEscalation).where(
        AiCoachEscalation.profile_id == profile_id,
        AiCoachEscalation.status.in_(["OPEN", "IN_REVIEW"]),
    ).order_by(desc(AiCoachEscalation.created_at))
    return (await db.execute(stmt_final)).scalars().all()


# ---------------------------------------------------------------------------
# 3. Cohort Triage Queue Generator
# ---------------------------------------------------------------------------

async def generate_cohort_triage_queue(
    cohort_id: int,
    placement_drive_id: Optional[int],
    filters: Optional[Dict[str, Any]],
    db: AsyncSession,
) -> CohortTriageReport:
    """
    Builds an explainable, multi-factor mentor triage queue across a real cohort.
    """
    filters = filters or {}
    breakthrough_only = bool(filters.get("breakthrough_only", False))
    escalations_only = bool(filters.get("escalations_only", False))
    high_urgency_only = bool(filters.get("high_urgency_only", False))
    active_interventions_only = bool(filters.get("active_interventions_only", False))

    # 1. Fetch Cohort
    cohort = await db.get(Cohort, cohort_id)
    if not cohort:
        raise ValueError(f"Cohort with id {cohort_id} not found.")

    # 2. Fetch Optional Placement Drive
    drive: Optional[PlacementDrive] = None
    drive_summary: Optional[CohortPlacementDriveSummary] = None
    if placement_drive_id:
        drive = await db.get(PlacementDrive, placement_drive_id)
        if drive:
            now_dt = datetime.now(timezone.utc)
            try:
                target_dt = datetime.strptime(drive.target_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                days_rem = max(0, (target_dt.date() - now_dt.date()).days)
            except Exception:
                days_rem = 30
            drive_summary = CohortPlacementDriveSummary(
                id=drive.id,
                company_name=drive.company_name,
                role_title=drive.role_title,
                target_date=drive.target_date,
                required_skills=drive.required_skills if isinstance(drive.required_skills, list) else [],
                days_remaining=days_rem,
            )

    # 3. Fetch Active Cohort Members
    stmt_members = (
        select(CohortMember)
        .where(
            CohortMember.cohort_id == cohort_id,
            CohortMember.is_active == True,
        )
        .options(
            selectinload(CohortMember.profile).selectinload(LearnerProfile.user),
            selectinload(CohortMember.profile).selectinload(LearnerProfile.readiness_snapshots),
        )
    )
    members = (await db.execute(stmt_members)).scalars().all()

    now = datetime.now(timezone.utc)
    queue_items: List[CohortTriageLearnerItem] = []

    total_readiness_sum = 0.0
    breakthrough_count = 0
    escalation_total_count = 0
    high_critical_count = 0

    for m in members:
        profile = m.profile
        if not profile:
            continue

        user = profile.user
        user_name = user.name if user and user.name else f"Learner #{profile.id}"
        user_email = user.email if user else f"learner_{profile.id}@pathfinder.dev"
        target_role = profile.current_context or "Software Engineer"

        # 4. Sync AI Escalations
        escalations = await detect_and_sync_ai_escalations(profile.id, db)
        if escalations:
            escalation_total_count += len(escalations)

        # 5. Compute Velocity
        velocity_info = await calculate_learner_velocity(profile.id, db)
        weekly_hours = velocity_info["velocity_hours_per_week"]

        # 6. Compute Skill Readiness Vector
        snapshots_dict = {s.skill_id: s.readiness_score for s in (profile.readiness_snapshots or [])}

        if drive and drive.required_skills and isinstance(drive.required_skills, list) and len(drive.required_skills) > 0:
            relevant_skill_keys = drive.required_skills
            threshold = drive.readiness_threshold or DEFAULT_READINESS_THRESHOLD
        else:
            # If no drive selected, evaluate across all tracked skills or baseline
            relevant_skill_keys = list(snapshots_dict.keys()) if snapshots_dict else ["python_basics", "sql_basics", "git_foundations"]
            threshold = DEFAULT_READINESS_THRESHOLD

        if relevant_skill_keys:
            relevant_scores = [snapshots_dict.get(k, 0.0) for k in relevant_skill_keys]
            relevant_readiness = sum(relevant_scores) / len(relevant_scores)
        else:
            relevant_readiness = 0.50

        total_readiness_sum += relevant_readiness

        # 7. Identify Blocking Skills
        blocking_skills_list = [
            BlockingSkillItem(skill=k, readiness_score=round(snapshots_dict.get(k, 0.0), 2))
            for k in relevant_skill_keys
            if snapshots_dict.get(k, 0.0) < threshold
        ]
        blocking_skills_list.sort(key=lambda b: b.readiness_score)
        gap_count = len(blocking_skills_list)

        # 8. Breakthrough Zone Detection: 0.80 <= relevant_readiness <= 0.95
        in_breakthrough = (0.80 <= relevant_readiness <= 0.95)
        if in_breakthrough:
            breakthrough_count += 1
        breakthrough_bonus = 1.5 if in_breakthrough else 1.0

        # 9. Drive Deadline Urgency Calculation
        urgency_factor = 0.0
        days_until_drive = None
        days_needed = None
        on_track = True

        if drive and drive.target_date:
            try:
                target_dt = datetime.strptime(drive.target_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                days_until_drive = max(0, (target_dt.date() - now.date()).days)
                hours_needed = gap_count * DEFAULT_SKILL_HOURS
                days_needed = math.ceil((hours_needed / max(1.0, weekly_hours)) * 7)
                on_track = days_needed <= days_until_drive
                if days_until_drive > 0:
                    urgency_factor = max(0.0, min(1.0, (days_needed / days_until_drive)))
                else:
                    urgency_factor = 1.0
            except Exception:
                pass

        drive_urgency_info = DriveUrgencyInfo(
            days_until_drive=days_until_drive,
            estimated_days_needed=days_needed,
            urgency_score=round(urgency_factor, 2),
            on_track=on_track,
            target_velocity_hours_per_week=weekly_hours,
        )

        # 10. Check Active Mentor Interventions
        stmt_intervention = select(MentorIntervention).where(
            MentorIntervention.profile_id == profile.id,
            MentorIntervention.status.in_(["PENDING", "SCHEDULED", "IN_PROGRESS"]),
        ).order_by(desc(MentorIntervention.created_at))
        active_intervention_record = (await db.execute(stmt_intervention)).scalars().first()

        active_intervention_summary = None
        intervention_adjustment = 0.0
        if active_intervention_record:
            active_intervention_summary = ActiveInterventionSummary(
                id=active_intervention_record.id,
                action_type=active_intervention_record.action_type,
                status=active_intervention_record.status,
                scheduled_at=active_intervention_record.scheduled_at.isoformat() if active_intervention_record.scheduled_at else None,
                mentor_name="Assigned Mentor",
            )
            # Slight dampener so already-handled learners do not crowd out unhandled ones
            intervention_adjustment = -0.15

        # 11. Escalation Component
        escalation_component = min(0.6, len(escalations) * 0.25)
        if any(e.severity == "CRITICAL" for e in escalations):
            escalation_component += 0.2

        # 12. Composite Explainable Triage Score
        readiness_comp = round(relevant_readiness, 4)
        urgency_comp = round(urgency_factor * 0.5, 4)
        raw_triage_score = (readiness_comp * (1.0 + urgency_comp) * breakthrough_bonus) + escalation_component + intervention_adjustment
        final_triage_score = round(max(0.05, min(2.5, raw_triage_score)), 3)

        # Priority Tier
        if final_triage_score >= 1.5 or any(e.severity == "CRITICAL" for e in escalations) or (not on_track and gap_count >= 3):
            priority_tier = "CRITICAL"
            high_critical_count += 1
        elif final_triage_score >= 1.1 or in_breakthrough or len(escalations) > 0:
            priority_tier = "HIGH"
            high_critical_count += 1
        elif final_triage_score >= 0.65:
            priority_tier = "MEDIUM"
        else:
            priority_tier = "LOW"

        # 13. Prescriptive Structured Action Recommendation
        focus_skills_list = [b.skill for b in blocking_skills_list[:3]]

        if escalations:
            top_esc = escalations[0]
            recommended_action = PrescriptiveAction(
                action_type="AI_ESCALATION_REVIEW",
                priority="CRITICAL" if top_esc.severity == "CRITICAL" else "HIGH",
                duration_minutes=30,
                focus_skills=[top_esc.skill_id] if top_esc.skill_id else focus_skills_list[:2],
                reason=f"Active AI Escalation: {top_esc.reason}",
                recommended_timing="WITHIN_24_HOURS",
            )
        elif in_breakthrough:
            skills_str = ", ".join(focus_skills_list[:2]) if focus_skills_list else "system design mocks"
            recommended_action = PrescriptiveAction(
                action_type="TARGETED_1ON1",
                priority="HIGH",
                duration_minutes=30,
                focus_skills=focus_skills_list[:2],
                reason=f"Learner is in Breakthrough Zone ({round(relevant_readiness * 100)}% readiness). 1 targeted review on {skills_str} will clear placement threshold.",
                recommended_timing="WITHIN_48_HOURS",
            )
        elif not on_track and days_until_drive is not None:
            recommended_action = PrescriptiveAction(
                action_type="URGENT_INTERVENTION",
                priority="CRITICAL",
                duration_minutes=45,
                focus_skills=focus_skills_list,
                reason=f"Upcoming {drive.company_name if drive else 'company'} drive in {days_until_drive} days requires ~{days_needed} days at current velocity ({weekly_hours} hrs/wk). Workload restructuring needed.",
                recommended_timing="WITHIN_24_HOURS",
            )
        elif gap_count > 3:
            recommended_action = PrescriptiveAction(
                action_type="INDEPENDENT_MONITORING",
                priority="LOW",
                duration_minutes=15,
                focus_skills=focus_skills_list[:2],
                reason="Learner has foundational curriculum milestones remaining; recommend following sprint plan with weekly async check-in.",
                recommended_timing="MONITOR_WEEKLY",
            )
        else:
            recommended_action = PrescriptiveAction(
                action_type="ASYNC_REVIEW",
                priority="MEDIUM",
                duration_minutes=20,
                focus_skills=focus_skills_list,
                reason="Review recent Prove-It attempts and coding evaluations async to reinforce edge cases.",
                recommended_timing="THIS_WEEK",
            )

        score_breakdown = TriageScoreBreakdown(
            readiness_component=readiness_comp,
            breakthrough_bonus=breakthrough_bonus,
            urgency_component=urgency_comp,
            escalation_component=round(escalation_component, 3),
            active_intervention_adjustment=intervention_adjustment,
            final_triage_score=final_triage_score,
        )

        escalation_items = [
            EscalationItem(
                id=e.id,
                skill_id=e.skill_id,
                reason=e.reason,
                severity=e.severity,
                thrash_index=e.thrash_index,
                source=e.source,
                status=e.status,
                created_at=e.created_at.isoformat() if e.created_at else now.isoformat(),
            )
            for e in escalations
        ]

        item = CohortTriageLearnerItem(
            profile_id=profile.id,
            user_id=user.id if user else profile.user_id,
            learner_name=user_name,
            learner_email=user_email,
            target_role=target_role,
            readiness_pct=round(relevant_readiness * 100, 1),
            relevant_readiness_score=round(relevant_readiness, 4),
            triage_score=final_triage_score,
            priority=priority_tier,
            in_breakthrough_zone=in_breakthrough,
            blocking_skills=blocking_skills_list,
            gap_skills_count=gap_count,
            drive_urgency=drive_urgency_info,
            active_escalations=escalation_items,
            active_intervention=active_intervention_summary,
            recommended_action=recommended_action,
            score_breakdown=score_breakdown,
        )

        # Apply Filters
        if breakthrough_only and not in_breakthrough:
            continue
        if escalations_only and len(escalation_items) == 0:
            continue
        if high_urgency_only and priority_tier not in ("CRITICAL", "HIGH"):
            continue
        if active_interventions_only and active_intervention_summary is None:
            continue

        queue_items.append(item)

    # Sort queue descending by triage priority score
    queue_items.sort(key=lambda x: -x.triage_score)

    total_learners_count = len(members)
    avg_cohort_readiness = (
        round((total_readiness_sum / total_learners_count) * 100, 1)
        if total_learners_count > 0
        else 0.0
    )

    summary = CohortTriageSummary(
        total_learners=total_learners_count,
        breakthrough_candidates=breakthrough_count,
        active_escalations=escalation_total_count,
        high_critical_priority=high_critical_count,
        average_readiness_pct=avg_cohort_readiness,
    )

    return CohortTriageReport(
        cohort_id=cohort.id,
        cohort_name=cohort.name,
        placement_drive=drive_summary,
        summary=summary,
        items=queue_items,
        generated_at=now.isoformat(),
    )
