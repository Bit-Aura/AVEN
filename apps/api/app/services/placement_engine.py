"""
Placement Engine — Placement Season War Room & Mentor Triage Queue.

Provides:
1. Placement Sprint Planner: Given a company's target interview date,
   reverse-engineers a week-by-week skill sprint schedule from the
   learner's current path and the company's most-demanded patterns.

2. Mentor Triage Queue: Algorithmic triage sorting learners for
   mentor office-hours based on who is closest to a drive-readiness
   threshold (the "90th percentile breakthrough zone").

Architecture:
  - Company profiles are stored in a curated dict (expandable to DB).
  - Triage scoring is a weighted formula:
      score = readiness * gap_urgency * (1 / days_until_drive)
    where gap_urgency = 1 - (days_needed / days_available) clamped to [0,1].
  - No LLM involved. The domain engine decides; AI may explain.
"""
import logging
import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Any

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import ReadinessSnapshot, AssessmentAttempt
from app.infrastructure.neo4j.client import Neo4jClient

logger = logging.getLogger(__name__)

DEFAULT_WEEKLY_HOURS = 10.0
DEFAULT_SKILL_HOURS = 5.0
READINESS_THRESHOLD = 0.70


# ---------------------------------------------------------------------------
# Curated Company Drive Profiles
# ---------------------------------------------------------------------------

COMPANY_PROFILES: Dict[str, Dict] = {
    "microsoft": {
        "name": "Microsoft",
        "priority_skills": [
            "python_basics", "python_advanced", "system_design",
            "async_python", "api_design", "db_design",
        ],
        "focus_areas": ["Data Structures & Algorithms", "System Design", "Behavioral"],
        "typical_rounds": 4,
    },
    "amazon": {
        "name": "Amazon",
        "priority_skills": [
            "python_basics", "system_design", "db_design",
            "api_design", "async_python", "postgres_advanced",
        ],
        "focus_areas": ["Leadership Principles", "DSA", "System Design", "SQL"],
        "typical_rounds": 5,
    },
    "google": {
        "name": "Google",
        "priority_skills": [
            "python_advanced", "async_python", "system_design",
            "api_design", "python_basics", "http_fundamentals",
        ],
        "focus_areas": ["DSA (Hard)", "System Design", "Coding Style", "Googleyness"],
        "typical_rounds": 5,
    },
    "stripe": {
        "name": "Stripe",
        "priority_skills": [
            "api_design", "fastapi_basics", "http_fundamentals",
            "python_advanced", "postgres_advanced", "async_python",
        ],
        "focus_areas": ["API Design", "Backend Systems", "Code Quality"],
        "typical_rounds": 3,
    },
    "startup": {
        "name": "Generic Startup",
        "priority_skills": [
            "fastapi_basics", "api_design", "sql_basics",
            "python_basics", "http_fundamentals",
        ],
        "focus_areas": ["Fullstack Velocity", "API Building", "SQL Queries"],
        "typical_rounds": 2,
    },
}


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class PlacementDriveInput(BaseModel):
    """Request to generate a sprint plan for a specific company drive."""
    profile_id: int
    company_id: str = Field(
        ..., description="Company key (e.g., 'microsoft', 'amazon', 'stripe', 'startup')."
    )
    drive_date: str = Field(
        ..., description="ISO date string for the target interview/OA date (YYYY-MM-DD)."
    )
    weekly_study_hours: float = Field(default=10.0, ge=1.0, le=80.0)


class WeekSprint(BaseModel):
    """A single weekly sprint in the placement plan."""
    week_number: int
    week_label: str            # e.g., "Week 1 (Aug 26 – Sep 1)"
    target_skills: List[str]   # Skill IDs to focus on this week
    focus_area: str            # Human-readable theme
    tasks: List[str]           # Concrete actionable tasks
    is_crunch_week: bool = False   # True for the final week before drive


class PlacementPlanReport(BaseModel):
    """Full week-by-week sprint plan for a placement drive."""
    profile_id: int
    company_name: str
    drive_date: str
    days_remaining: int
    weeks_available: int
    is_feasible: bool
    gap_skills: List[str]          # Skills still needed for this company
    sprint_weeks: List[WeekSprint]
    overall_recommendation: str


class MentorTriageEntry(BaseModel):
    """A single learner entry in the mentor triage queue."""
    profile_id: int
    display_label: str            # e.g., "Learner #42"
    readiness_pct: float
    triage_score: float           # Higher = more urgent for mentor help
    breakthrough_zone: bool       # True if in the 90th percentile zone
    gap_skills_count: int
    days_until_next_drive: Optional[int]
    recommended_action: str


class MentorTriageReport(BaseModel):
    """Ordered mentor triage queue for all tracked learners."""
    generated_at: str
    queue: List[MentorTriageEntry]


# ---------------------------------------------------------------------------
# Sprint Plan Logic
# ---------------------------------------------------------------------------

def _parse_drive_date(date_str: str) -> datetime:
    """Parse ISO date string to UTC datetime. Raises ValueError on bad input."""
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return dt.replace(tzinfo=timezone.utc)


def _build_sprint_weeks(
    gap_skills: List[str],
    focus_areas: List[str],
    drive_date: datetime,
    weekly_hours: float,
) -> List[WeekSprint]:
    """
    Distributes gap skills across available weeks.
    Each week gets 1-2 skills based on study budget.
    The final week before the drive is always a crunch-review week.
    """
    now = datetime.now(timezone.utc)
    days_remaining = max(0, (drive_date.date() - now.date()).days)
    weeks_available = max(1, days_remaining // 7)

    sprints: List[WeekSprint] = []
    skills_per_week = max(1, math.ceil(len(gap_skills) / max(1, weeks_available - 1)))

    skill_chunks: List[List[str]] = []
    for i in range(0, len(gap_skills), skills_per_week):
        skill_chunks.append(gap_skills[i:i + skills_per_week])

    for week_num in range(1, weeks_available + 1):
        week_start = now + timedelta(weeks=week_num - 1)
        week_end = week_start + timedelta(days=6)
        week_label = (
            f"Week {week_num} ({week_start.strftime('%b %d')} – {week_end.strftime('%b %d')})"
        )
        is_crunch = week_num == weeks_available

        if is_crunch:
            target_skills = gap_skills[-2:] if len(gap_skills) >= 2 else gap_skills
            focus_area = "Crunch Review & Mock Interviews"
            tasks = [
                "Redo every failed Prove-It checkpoint from previous weeks.",
                "Attempt 2 timed mock interview problems per day.",
                "Review the Decision Trace for all weak skills in the Trust Panel.",
                "Rest 1 full day before drive day.",
            ]
        else:
            chunk_idx = week_num - 1
            target_skills = skill_chunks[chunk_idx] if chunk_idx < len(skill_chunks) else []
            focus_idx = (week_num - 1) % len(focus_areas) if focus_areas else 0
            focus_area = focus_areas[focus_idx] if focus_areas else "Core Skills"
            tasks = [
                f"Complete all resources for: {', '.join(target_skills) if target_skills else 'review all topics'}.",
                f"Pass the Prove-It gate for each target skill.",
                f"Focus area: {focus_area}.",
                "Log any persistent confusion to the AI Coach for targeted tutoring.",
            ]

        sprints.append(WeekSprint(
            week_number=week_num,
            week_label=week_label,
            target_skills=target_skills,
            focus_area=focus_area,
            tasks=tasks,
            is_crunch_week=is_crunch,
        ))

    return sprints


async def generate_placement_plan(
    payload: PlacementDriveInput,
    db: AsyncSession,
    neo4j_client: Neo4jClient,
) -> PlacementPlanReport:
    """
    Generates a week-by-week sprint plan for a company placement drive.
    """
    company = COMPANY_PROFILES.get(payload.company_id.lower())
    if not company:
        # Fallback to generic startup profile
        company = COMPANY_PROFILES["startup"]
        logger.warning(f"[PlacementEngine] Unknown company '{payload.company_id}'. Using generic startup.")

    try:
        drive_date = _parse_drive_date(payload.drive_date)
    except ValueError:
        drive_date = datetime.now(timezone.utc) + timedelta(weeks=8)
        logger.warning(f"[PlacementEngine] Invalid drive_date '{payload.drive_date}'. Defaulting to 8 weeks.")

    # Fetch learner readiness
    stmt = select(ReadinessSnapshot).where(ReadinessSnapshot.profile_id == payload.profile_id)
    snapshots = {s.skill_id: s.readiness_score for s in (await db.execute(stmt)).scalars().all()}

    # Identify gap skills (company priority skills not yet mastered)
    gap_skills = [
        s for s in company["priority_skills"]
        if snapshots.get(s, 0.0) < READINESS_THRESHOLD
    ]

    now = datetime.now(timezone.utc)
    days_remaining = max(0, (drive_date.date() - now.date()).days)
    weeks_available = max(1, days_remaining // 7)

    # Feasibility check: can we cover gap skills at given weekly hours?
    total_gap_hours = len(gap_skills) * DEFAULT_SKILL_HOURS
    total_available_hours = weeks_available * payload.weekly_study_hours
    is_feasible = total_available_hours >= total_gap_hours

    sprint_weeks = _build_sprint_weeks(
        gap_skills,
        company["focus_areas"],
        drive_date,
        payload.weekly_study_hours,
    )

    if is_feasible:
        recommendation = (
            f"At {payload.weekly_study_hours:.0f} hrs/week, you have enough time to cover all "
            f"{len(gap_skills)} gap skill(s) before {payload.drive_date}. Follow the sprint plan."
        )
    else:
        shortfall = math.ceil((total_gap_hours - total_available_hours) / payload.weekly_study_hours)
        recommendation = (
            f"⚠️ Tight timeline! You need ~{total_gap_hours:.0f} hours but only have ~{total_available_hours:.0f} "
            f"available. Consider increasing to {payload.weekly_study_hours + shortfall:.0f} hrs/week "
            f"or using the Career Alternatives panel to find a role you're closer to."
        )

    logger.info(
        f"[PlacementEngine] profile={payload.profile_id} company={company['name']} "
        f"gap_skills={len(gap_skills)} weeks={weeks_available} feasible={is_feasible}"
    )

    return PlacementPlanReport(
        profile_id=payload.profile_id,
        company_name=company["name"],
        drive_date=payload.drive_date,
        days_remaining=days_remaining,
        weeks_available=weeks_available,
        is_feasible=is_feasible,
        gap_skills=gap_skills,
        sprint_weeks=sprint_weeks,
        overall_recommendation=recommendation,
    )


# ---------------------------------------------------------------------------
# Mentor Triage Queue Logic
# ---------------------------------------------------------------------------

class MentorTriageInput(BaseModel):
    """Request to generate the triage queue across all active learners."""
    profile_ids: List[int] = Field(..., description="List of all active learner profile IDs.")
    drive_date: Optional[str] = Field(
        default=None,
        description="Optional upcoming drive date for urgency weighting."
    )


async def generate_mentor_triage_queue(
    payload: MentorTriageInput,
    db: AsyncSession,
    neo4j_client: Neo4jClient,
) -> MentorTriageReport:
    """
    Builds a triage-sorted mentor queue across a cohort of learners.

    Triage Score = readiness_score * (1 + urgency_factor) * proximity_bonus
      - urgency_factor = (1 - days_needed/days_available) clamped [0,1]
      - proximity_bonus = 1.5 if learner is in 80-95% readiness range (breakthrough zone)
    """
    drive_date_dt: Optional[datetime] = None
    if payload.drive_date:
        try:
            drive_date_dt = _parse_drive_date(payload.drive_date)
        except ValueError:
            pass

    now = datetime.now(timezone.utc)
    days_until_drive = None
    if drive_date_dt:
        days_until_drive = max(0, (drive_date_dt.date() - now.date()).days)

    queue_entries: List[MentorTriageEntry] = []

    for pid in payload.profile_ids:
        # Fetch readiness snapshots
        stmt = select(ReadinessSnapshot).where(ReadinessSnapshot.profile_id == pid)
        snaps = (await db.execute(stmt)).scalars().all()
        if not snaps:
            continue

        mastered = [s for s in snaps if s.readiness_score >= READINESS_THRESHOLD]
        gap_count = len(snaps) - len(mastered)
        avg_readiness = sum(s.readiness_score for s in snaps) / len(snaps)

        # Proximity bonus: learners in 80-95% zone need a final push from mentors
        in_breakthrough_zone = 0.80 <= avg_readiness <= 0.95
        proximity_bonus = 1.5 if in_breakthrough_zone else 1.0

        # Urgency factor (0.0 if no drive date context)
        urgency_factor = 0.0
        if days_until_drive is not None and days_until_drive > 0:
            days_needed = gap_count * DEFAULT_SKILL_HOURS / DEFAULT_WEEKLY_HOURS * 7
            urgency_factor = max(0.0, min(1.0, 1.0 - (days_needed / days_until_drive)))

        triage_score = round(avg_readiness * (1.0 + urgency_factor) * proximity_bonus, 4)

        # Recommended mentor action
        if in_breakthrough_zone:
            action = "Schedule a 30-min targeted session — this learner is 1 review away from drive readiness."
        elif gap_count > 5:
            action = "Recommend the learner follow the sprint plan independently; monitor weekly."
        else:
            action = "Async review of weak Prove-It results; respond to AI Coach escalations."

        queue_entries.append(MentorTriageEntry(
            profile_id=pid,
            display_label=f"Learner #{pid}",
            readiness_pct=round(avg_readiness * 100, 1),
            triage_score=triage_score,
            breakthrough_zone=in_breakthrough_zone,
            gap_skills_count=gap_count,
            days_until_next_drive=days_until_drive,
            recommended_action=action,
        ))

    # Sort by triage score descending (highest priority first)
    queue_entries.sort(key=lambda e: -e.triage_score)

    logger.info(
        f"[PlacementEngine/Triage] generated queue for {len(queue_entries)} learners, "
        f"drive_date={payload.drive_date}"
    )

    return MentorTriageReport(
        generated_at=now.isoformat(),
        queue=queue_entries,
    )
