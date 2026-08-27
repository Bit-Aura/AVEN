"""
Career Engine — Dynamic Career Alternatives & Pivot Panel.

Computes a learner's readiness percentage for 2-3 adjacent high-demand roles
by comparing their current ReadinessSnapshot vector against role skill clusters
stored in a curated role-to-skills mapping.

Architecture Decision:
  - Role clusters are defined as ordered skill lists with weighted importance.
  - A learner's readiness for role R = weighted average of their BKT mastery
    scores across R's required skills.
  - This is deterministic: no LLM involved. The LLM should only explain
    the result if called separately via the explain_decision gateway.
  - Estimated weeks-to-readiness is projected using the learner's own
    weekly study budget preference (defaults to 10 hrs/week).
"""
import logging
import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import ReadinessSnapshot
from app.infrastructure.neo4j.client import Neo4jClient

logger = logging.getLogger(__name__)

DEFAULT_WEEKLY_HOURS = 10.0
DEFAULT_SKILL_HOURS = 5.0
MASTERY_THRESHOLD = 0.70


# ---------------------------------------------------------------------------
# Role Cluster Definitions
# Skills listed in priority order; weight = 1/(index+1) normalized.
# ---------------------------------------------------------------------------

ROLE_CLUSTERS: Dict[str, Dict] = {
    "backend_swe": {
        "title": "Backend Software Engineer",
        "required_skills": [
            "python_basics", "python_advanced", "sql_basics", "db_design",
            "http_fundamentals", "api_design", "fastapi_basics",
            "async_python", "postgres_advanced", "system_design",
        ],
        "market_demand_score": 0.92,
        "avg_salary_usd": 135000,
        "job_growth_pct": 22,
    },
    "data_engineer": {
        "title": "Data & Analytics Engineer",
        "required_skills": [
            "python_basics", "sql_basics", "db_design", "postgres_advanced",
            "python_advanced", "http_fundamentals", "async_python",
        ],
        "market_demand_score": 0.88,
        "avg_salary_usd": 128000,
        "job_growth_pct": 31,
    },
    "devops_platform": {
        "title": "DevOps / Platform Engineer",
        "required_skills": [
            "http_fundamentals", "api_design", "system_design",
            "python_basics", "async_python",
        ],
        "market_demand_score": 0.85,
        "avg_salary_usd": 142000,
        "job_growth_pct": 28,
    },
    "mlops_engineer": {
        "title": "MLOps Engineer",
        "required_skills": [
            "python_basics", "python_advanced", "async_python",
            "sql_basics", "api_design", "fastapi_basics", "system_design",
        ],
        "market_demand_score": 0.79,
        "avg_salary_usd": 155000,
        "job_growth_pct": 45,
    },
    "fullstack_swe": {
        "title": "Full-Stack Engineer",
        "required_skills": [
            "python_basics", "http_fundamentals", "api_design",
            "fastapi_basics", "sql_basics", "db_design",
        ],
        "market_demand_score": 0.90,
        "avg_salary_usd": 130000,
        "job_growth_pct": 19,
    },
}


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class AlternativeRole(BaseModel):
    """A single adjacent role with readiness data."""
    role_id: str
    title: str
    readiness_pct: float = Field(description="Percentage of required skills mastered (0–100).")
    mastered_skills: List[str]
    missing_skills: List[str]
    estimated_weeks_to_ready: float
    estimated_target_date: str   # ISO date string
    market_demand_score: float
    avg_salary_usd: int
    job_growth_pct: int
    is_fast_track: bool = Field(
        description="True if this role is reachable faster than the learner's current target."
    )
    recommendation_badge: Optional[str] = None


class CareerAlternativesReport(BaseModel):
    """Full report showing readiness across all adjacent roles."""
    profile_id: int
    current_role_id: Optional[str]
    weekly_study_hours: float
    alternatives: List[AlternativeRole]


# ---------------------------------------------------------------------------
# Computation Logic
# ---------------------------------------------------------------------------

def _compute_role_readiness(
    role_skills: List[str],
    snapshots: Dict[str, float],
) -> tuple[float, List[str], List[str]]:
    """
    Computes weighted readiness for a role.

    Weighting: skills earlier in the required_skills list are more foundational
    and receive higher weight (geometric decay: weight_i = 1 / (i+1)).

    Returns: (readiness_fraction_0_to_1, mastered_ids, missing_ids)
    """
    if not role_skills:
        return 0.0, [], []

    total_weight = 0.0
    weighted_mastery = 0.0
    mastered: List[str] = []
    missing: List[str] = []

    for i, skill_id in enumerate(role_skills):
        weight = 1.0 / (i + 1)
        total_weight += weight
        score = snapshots.get(skill_id, 0.0)
        weighted_mastery += score * weight
        if score >= MASTERY_THRESHOLD:
            mastered.append(skill_id)
        else:
            missing.append(skill_id)

    readiness = weighted_mastery / total_weight if total_weight > 0 else 0.0
    return round(min(1.0, max(0.0, readiness)), 4), mastered, missing


def _project_weeks(missing_skills: List[str], weekly_hours: float) -> float:
    """Simple hours-to-weeks projection for missing skills at DEFAULT_SKILL_HOURS each."""
    if not missing_skills or weekly_hours <= 0:
        return 0.0
    total_hours = len(missing_skills) * DEFAULT_SKILL_HOURS
    return round(total_hours / weekly_hours, 1)


def _project_target_date(weeks: float) -> str:
    dt = datetime.now(timezone.utc) + timedelta(weeks=weeks)
    return dt.date().isoformat()


# ---------------------------------------------------------------------------
# Public Entry Point
# ---------------------------------------------------------------------------

async def get_career_alternatives(
    profile_id: int,
    db: AsyncSession,
    neo4j_client: Neo4jClient,
    current_role_id: Optional[str] = "backend_swe",
    weekly_study_hours: float = DEFAULT_WEEKLY_HOURS,
) -> CareerAlternativesReport:
    """
    Computes readiness for all defined role clusters and returns a sorted
    CareerAlternativesReport with fast-track recommendations.

    The function reads from PostgreSQL ReadinessSnapshot only — no Neo4j
    traversal needed here since role clusters are pre-defined.
    """
    # 1. Fetch all readiness snapshots for this profile
    stmt = select(ReadinessSnapshot).where(ReadinessSnapshot.profile_id == profile_id)
    snapshots_rows = (await db.execute(stmt)).scalars().all()
    snapshots: Dict[str, float] = {s.skill_id: s.readiness_score for s in snapshots_rows}

    logger.info(
        f"[CareerEngine] profile={profile_id} snapshot_count={len(snapshots)} "
        f"weekly_hrs={weekly_study_hours}"
    )

    # 2. Compute current role projected weeks (for fast-track comparison)
    current_weeks = None
    if current_role_id and current_role_id in ROLE_CLUSTERS:
        curr_cluster = ROLE_CLUSTERS[current_role_id]
        _, _, curr_missing = _compute_role_readiness(curr_cluster["required_skills"], snapshots)
        current_weeks = _project_weeks(curr_missing, weekly_study_hours)

    # 3. Dynamic Market Demand via Scraper Pipeline (Feature 7)
    from app.scraper.pipeline import JobScrapingPipeline
    pipeline = JobScrapingPipeline()
    
    alternatives: List[AlternativeRole] = []
    for role_id, cluster in ROLE_CLUSTERS.items():
        readiness_frac, mastered, missing = _compute_role_readiness(
            cluster["required_skills"], snapshots
        )
        weeks = _project_weeks(missing, weekly_study_hours)
        target_date = _project_target_date(weeks)
        is_fast_track = current_weeks is not None and weeks < current_weeks and role_id != current_role_id

        # Use the pipeline to get dynamic signal for backend roles (example)
        market_score = cluster["market_demand_score"]
        if role_id == "backend_swe" and getattr(pipeline.greenhouse_source, 'fetch_raw_jobs', None):
            try:
                # Fire and forget / or await if fast enough. For demo, we just simulate the integration point.
                # In production, this would read from the DB populated by the async ETL.
                pass
            except Exception as e:
                logger.warning(f"Failed to fetch dynamic demand: {e}")

        badge = None
        if is_fast_track:
            badge = "⚡ Fast-Track Opportunity"
        elif readiness_frac >= 0.85 and role_id != current_role_id:
            badge = "✅ Nearly Ready"
        elif cluster["market_demand_score"] >= 0.88 and role_id != current_role_id:
            badge = "🔥 High Market Demand"

        alternatives.append(AlternativeRole(
            role_id=role_id,
            title=cluster["title"],
            readiness_pct=round(readiness_frac * 100, 1),
            mastered_skills=mastered,
            missing_skills=missing,
            estimated_weeks_to_ready=weeks,
            estimated_target_date=target_date,
            market_demand_score=market_score,
            avg_salary_usd=cluster["avg_salary_usd"],
            job_growth_pct=cluster["job_growth_pct"],
            is_fast_track=is_fast_track,
            recommendation_badge=badge,
        ))

    # 4. Sort: fast-track first, then by readiness descending, then by market demand
    alternatives.sort(key=lambda r: (
        not r.is_fast_track,
        -r.readiness_pct,
        -r.market_demand_score,
    ))

    return CareerAlternativesReport(
        profile_id=profile_id,
        current_role_id=current_role_id,
        weekly_study_hours=weekly_study_hours,
        alternatives=alternatives,
    )
