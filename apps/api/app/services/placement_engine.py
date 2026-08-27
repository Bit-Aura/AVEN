"""
Placement Engine — Dynamic Placement Season War Room & Mentor Triage Queue.

Provides:
1. Dynamic Placement Sprint Planner: Given ANY company and target interview date,
   dynamically synthesizes the company's real-world tech stack & interview expectations
   for the learner's specific career domain (e.g., Backend, Frontend, AI/ML, DevOps)
   using AI synthesis, live ATS scraping, and the Neo4j Ground-Truth Skill Graph.

2. Mentor Triage Queue: Algorithmic triage sorting learners for
   mentor office-hours based on who is closest to a drive-readiness
   threshold (the "90th percentile breakthrough zone").
"""
import logging
import math
import json
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Any

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import ReadinessSnapshot, AssessmentAttempt, LearnerProfile, Goal, PathVersion
from app.infrastructure.neo4j.client import Neo4jClient
from app.infrastructure.ai.gateway import OllamaAdapter
from app.core.config import settings

logger = logging.getLogger(__name__)

DEFAULT_WEEKLY_HOURS = 10.0
DEFAULT_SKILL_HOURS = 5.0
READINESS_THRESHOLD = 0.70

# In-memory cache for dynamically synthesized company intelligence
DYNAMIC_COMPANY_CACHE: Dict[str, Dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class PlacementDriveInput(BaseModel):
    """Request to generate a sprint plan for a specific company drive."""
    profile_id: int
    company_id: str = Field(
        ..., description="Company name or slug (e.g., 'OpenAI', 'Tesla', 'Nvidia', 'Figma', 'Stripe')."
    )
    drive_date: str = Field(
        ..., description="ISO date string for the target interview/OA date (YYYY-MM-DD)."
    )
    target_role: Optional[str] = Field(
        default=None, description="Optional target domain role (e.g., 'Backend Software Engineer', 'AI/ML Engineer')."
    )
    weekly_study_hours: Optional[float] = Field(default=None, ge=1.0, le=80.0)


class SprintTask(BaseModel):
    title: str
    action_type: str = Field(..., description="'assessment', 'resource', 'mock_interview', or 'info'")
    action_payload: Optional[str] = None


class WeekSprint(BaseModel):
    """A single weekly sprint in the placement plan."""
    week_number: int
    week_label: str            # e.g., "Week 1 (Aug 26 – Sep 1)"
    target_skills: List[str]   # Skill IDs to focus on this week
    focus_area: str            # Human-readable theme
    tasks: List[SprintTask]    # Concrete actionable tasks
    is_crunch_week: bool = False   # True for the final week before drive


class MarketSignal(BaseModel):
    job_title: str
    url: Optional[str] = None
    extracted_skills: List[str]


class PlacementPlanReport(BaseModel):
    """Full week-by-week sprint plan for a placement drive."""
    profile_id: int
    company_name: str
    target_role: str
    drive_date: str
    days_remaining: int
    weeks_available: int
    is_feasible: bool
    weekly_study_hours: float
    total_gap_hours: float
    stress_index_pct: float
    gap_skills: List[str]          # Skills still needed for this company
    sprint_weeks: List[WeekSprint]
    overall_recommendation: str
    market_signals: Optional[List[MarketSignal]] = None


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
# Dynamic Company & Skill Graph Synthesizer
# ---------------------------------------------------------------------------

async def fetch_available_graph_skills(neo4j_client: Neo4jClient) -> List[str]:
    """
    Retrieves all registered Skill node IDs from the ground-truth Neo4j graph.
    """
    try:
        query = "MATCH (s:Skill) RETURN s.id as id ORDER BY s.id"
        results = await neo4j_client.execute_query(query)
        if results:
            return [r["id"] for r in results if "id" in r]
    except Exception as e:
        logger.warning(f"[PlacementEngine] Neo4j skill query warning: {e}")
    
    # Safe fallback core taxonomy
    return [
        "python_basics", "python_advanced", "sql_basics", "postgres_advanced",
        "db_design", "api_design", "fastapi_basics", "async_python",
        "system_design", "git_foundations", "http_methods", "docker_basics",
        "react_basics", "react_advanced", "node_advanced", "ml_basics"
    ]


async def fetch_role_skills_from_neo4j(target_role: str, neo4j_client: Neo4jClient) -> List[str]:
    """
    Fetches required skill IDs for a given role directly from the Neo4j graph.
    """
    try:
        query = """
        MATCH (r:Role)-[:REQUIRES]->(s:Skill)
        WHERE toLower(r.name) CONTAINS toLower($role_name) OR toLower(r.id) CONTAINS toLower($role_name)
        RETURN s.id AS id
        """
        results = await neo4j_client.execute_query(query, {"role_name": target_role})
        if results:
            return [r["id"] for r in results if "id" in r]
    except Exception as e:
        logger.warning(f"[PlacementEngine] Neo4j role skills query warning: {e}")
    return []


async def synthesize_dynamic_company_profile(
    company_name: str,
    target_role: str,
    available_skills: List[str],
    neo4j_role_skills: List[str]
) -> Dict[str, Any]:
    """
    Dynamically analyzes any company for a specific technical role using AI synthesis.
    Zero hardcoded company data: works for OpenAI, Nvidia, Tesla, Stripe, or any startup.
    """
    cache_key = f"{company_name.lower().strip()}_{target_role.lower().strip()}"
    if cache_key in DYNAMIC_COMPANY_CACHE:
        return DYNAMIC_COMPANY_CACHE[cache_key]

    logger.info(f"[PlacementEngine] Synthesizing dynamic profile for '{company_name}' ({target_role})...")

    # Construct intelligent LLM prompt
    ai = OllamaAdapter()
    prompt = f"""
You are a Principal Technical Recruiter and Engineering Hiring Director.
Analyze the company '{company_name}' for candidates interviewing for the role: '{target_role}'.

Available System Skill Graph IDs:
{json.dumps(available_skills)}

Known Core Role Skills:
{json.dumps(neo4j_role_skills)}

Determine:
1. The proper capitalized company name.
2. Top 5-8 priority technical skill IDs needed for this company and role. Select strictly from the Available System Skill Graph IDs above wherever possible.
3. 4-6 specific real-world interview round focus areas / themes for {company_name} (e.g. 'Distributed Systems & Scalability', 'Low-Latency Async Concurrency', 'Database Optimization', 'System Architecture', 'Behavioral & Culture').
4. Typical number of interview rounds (usually 4 to 6).

Output STRICTLY valid JSON conforming to this schema:
{{
  "name": "{company_name.title()}",
  "priority_skills": ["string (skill_id_1)", "string (skill_id_2)", ...],
  "focus_areas": ["string (theme 1)", "string (theme 2)", ...],
  "typical_rounds": 5
}}

Do not include any explanation or markdown fences outside the JSON. Return only raw JSON.
"""
    try:
        response_text = await ai._chat(
            system="You are an expert technical curriculum and hiring intelligence architect. You output only valid schema JSON.",
            user_prompt=prompt,
            max_tokens=1000
        )
        data = ai._parse_json_robust(response_text)
        
        # Sanitize skills: ensure they exist in available_skills or fallback
        valid_priority = [s for s in data.get("priority_skills", []) if s in available_skills]
        if not valid_priority:
            valid_priority = neo4j_role_skills if neo4j_role_skills else available_skills[:6]

        profile = {
            "name": data.get("name", company_name.title()),
            "priority_skills": valid_priority,
            "focus_areas": data.get("focus_areas", [
                "Data Structures & Problem Solving",
                "System Architecture & Scalability",
                "Database Modeling & Performance",
                "API Design & Concurrency",
                "Behavioral & Culture"
            ]),
            "typical_rounds": int(data.get("typical_rounds", 4))
        }
        DYNAMIC_COMPANY_CACHE[cache_key] = profile
        return profile
    except Exception as e:
        logger.warning(f"[PlacementEngine] Dynamic synthesis fallback for {company_name}: {e}")
        fallback_profile = {
            "name": company_name.title(),
            "priority_skills": neo4j_role_skills if neo4j_role_skills else available_skills[:7],
            "focus_areas": [
                f"{target_role} Core Problem Solving",
                "System Scalability & Architecture",
                "Database Design & Query Optimization",
                "API Design & Concurrency",
                "Live Coding & Mock Interviews"
            ],
            "typical_rounds": 4
        }
        DYNAMIC_COMPANY_CACHE[cache_key] = fallback_profile
        return fallback_profile


# ---------------------------------------------------------------------------
# Sprint Plan Logic
# ---------------------------------------------------------------------------

def _parse_drive_date(date_str: str) -> datetime:
    """Parse ISO date string to UTC datetime. Raises ValueError on bad input."""
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return dt.replace(tzinfo=timezone.utc)


def _build_sprint_weeks(
    gap_skills: List[str],
    all_priority_skills: List[str],
    focus_areas: List[str],
    drive_date: datetime,
    weekly_hours: float,
) -> List[WeekSprint]:
    """
    Distributes gap skills and core interview milestones dynamically across all available weeks.
    Ensures every non-crunch week has concrete target skills and actionable interactive tasks.
    The final week before the drive is always a structured crunch-review week.
    """
    now = datetime.now(timezone.utc)
    days_remaining = max(0, (drive_date.date() - now.date()).days)
    weeks_available = max(1, days_remaining // 7)

    sprints: List[WeekSprint] = []

    # Build prioritized skills pool:
    # 1. Unmastered gap skills first
    # 2. Company priority skills
    skills_pool: List[str] = list(gap_skills)
    for s in all_priority_skills:
        if s not in skills_pool:
            skills_pool.append(s)

    non_crunch_weeks = max(1, weeks_available - 1)
    skills_per_week = max(1, math.ceil(len(skills_pool) / non_crunch_weeks))

    for week_num in range(1, weeks_available + 1):
        week_start = now + timedelta(weeks=week_num - 1)
        week_end = week_start + timedelta(days=6)
        week_label = (
            f"Week {week_num} ({week_start.strftime('%b %d')} – {week_end.strftime('%b %d')})"
        )
        is_crunch = (week_num == weeks_available)

        if is_crunch:
            target_skills = gap_skills[-2:] if len(gap_skills) >= 2 else (skills_pool[:2] if skills_pool else ["system_design"])
            focus_area = "Crunch Review & Mock Interviews"
            tasks = [
                SprintTask(
                    title="Redo all failed Prove-It checkpoints and review weak concepts.",
                    action_type="info"
                ),
                SprintTask(
                    title="Attempt 2 timed mock coding interview rounds per day.",
                    action_type="mock_interview"
                ),
                SprintTask(
                    title="Review the Decision Trace for all skills in your Proof Portfolio.",
                    action_type="info"
                ),
                SprintTask(
                    title="Rest 1 full day before interview day to maximize performance.",
                    action_type="info"
                )
            ]
        else:
            start_idx = (week_num - 1) * skills_per_week
            target_skills = skills_pool[start_idx : start_idx + skills_per_week]
            if not target_skills:
                wrap_idx = (week_num - 1) % len(skills_pool)
                target_skills = [skills_pool[wrap_idx]]

            focus_idx = (week_num - 1) % len(focus_areas) if focus_areas else 0
            focus_area = focus_areas[focus_idx] if focus_areas else "Core Skills"

            tasks = []
            for skill in target_skills:
                skill_clean = skill.replace("_", " ").title()
                is_gap = skill in gap_skills
                tasks.append(SprintTask(
                    title=f"Complete masterclass resources for {skill_clean}." if is_gap else f"Reinforce advanced patterns for {skill_clean}.",
                    action_type="resource",
                    action_payload=skill
                ))
                tasks.append(SprintTask(
                    title=f"Pass the Prove-It challenge gate for {skill_clean}.",
                    action_type="assessment",
                    action_payload=skill
                ))
            
            tasks.append(SprintTask(
                title=f"Complete timed coding speed drill for {focus_area}.",
                action_type="mock_interview"
            ))
            tasks.append(SprintTask(
                title="Log questions or blockers to the AI Coach.",
                action_type="info"
            ))

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
    Dynamically generates a week-by-week sprint plan for ANY company placement drive.
    Combines AI synthesis, Neo4j skill graphs, and live ATS scraping.
    """
    # 1. Determine learner's target role dynamically from DB if not passed in payload
    target_role = payload.target_role
    if not target_role:
        goal_stmt = select(Goal).where(Goal.profile_id == payload.profile_id).order_by(Goal.created_at.desc())
        goal_res = (await db.execute(goal_stmt)).scalars().first()
        if goal_res and goal_res.title:
            target_role = goal_res.title
        else:
            target_role = "Backend Software Engineer"

    # 2. Fetch available skill graph IDs & role skills from Neo4j
    available_graph_skills = await fetch_available_graph_skills(neo4j_client)
    neo4j_role_skills = await fetch_role_skills_from_neo4j(target_role, neo4j_client)

    # 3. Dynamically synthesize company profile for this specific company + role
    company_profile = await synthesize_dynamic_company_profile(
        company_name=payload.company_id,
        target_role=target_role,
        available_skills=available_graph_skills,
        neo4j_role_skills=neo4j_role_skills
    )

    # 4. Augment with live ATS market scraping (Feature 7)
    from app.scraper.pipeline import JobScrapingPipeline
    pipeline = JobScrapingPipeline()
    market_signals = []
    company_id_lower = payload.company_id.lower().strip()

    try:
        logger.info(f"[PlacementEngine] Fetching real-time market signals for '{payload.company_id}'...")
        extracted_jobs = []
        
        try:
            scrape_result = await pipeline.lever_source.fetch_raw_jobs(board_identifier=company_id_lower)
            for raw_job in scrape_result[:3]:
                job = pipeline.lever_source.extract_job(raw_job, company_name=payload.company_id)
                if job and job.description:
                    extracted_jobs.append(job)
        except Exception:
            pass

        if not extracted_jobs:
            try:
                scrape_result = await pipeline.greenhouse_source.fetch_raw_jobs(board_identifier=company_id_lower)
                for raw_job in scrape_result[:3]:
                    job = pipeline.greenhouse_source.extract_job(raw_job, company_name=payload.company_id)
                    if job and job.description:
                        extracted_jobs.append(job)
            except Exception:
                pass

        if not extracted_jobs:
            from app.scraper.models import ScrapedJob
            job1 = ScrapedJob(
                external_id=f"dyn-job-{company_id_lower}-1",
                source="market-inference",
                title=f"{target_role}",
                company=company_profile["name"],
                description=f"Hiring {target_role} proficient in scalable architecture, system design, and production engineering at {company_profile['name']}.",
                url=f"https://www.linkedin.com/jobs/search/?keywords={company_id_lower}+{target_role.replace(' ', '+')}"
            )
            extracted_jobs.append(job1)

        keyword_mapping = {
            "python": "python_advanced",
            "react": "react_advanced",
            "node": "node_advanced",
            "aws": "aws_basics",
            "docker": "docker_basics",
            "machine learning": "ml_basics",
            "genai": "genai_basics",
            "system design": "system_design",
            "async": "async_python",
            "api": "api_design",
            "sql": "sql_basics",
            "postgres": "postgres_advanced"
        }

        for job in extracted_jobs:
            found_skills = set()
            desc_lower = job.description.lower()
            for kw, skill_id in keyword_mapping.items():
                if kw in desc_lower and skill_id in available_graph_skills:
                    found_skills.add(skill_id)
                    if skill_id not in company_profile["priority_skills"]:
                        company_profile["priority_skills"].append(skill_id)

            if found_skills:
                market_signals.append(MarketSignal(
                    job_title=job.title,
                    url=job.url,
                    extracted_skills=list(found_skills)
                ))
    except Exception as e:
        logger.warning(f"[PlacementEngine] Live market scraping warning: {e}")

    # 5. Parse target drive date
    try:
        drive_date = _parse_drive_date(payload.drive_date)
    except ValueError:
        drive_date = datetime.now(timezone.utc) + timedelta(weeks=8)
        logger.warning(f"[PlacementEngine] Invalid drive_date '{payload.drive_date}'. Defaulting to 8 weeks.")

    # 6. Fetch learner readiness snapshots from DB
    stmt = select(ReadinessSnapshot).where(ReadinessSnapshot.profile_id == payload.profile_id)
    snapshots = {s.skill_id: s.readiness_score for s in (await db.execute(stmt)).scalars().all()}

    prof_stmt = select(LearnerProfile).where(LearnerProfile.id == payload.profile_id)
    profile = (await db.execute(prof_stmt)).scalar_one_or_none()

    weekly_study_hours = payload.weekly_study_hours
    if weekly_study_hours is None:
        weekly_study_hours = profile.last_known_weekly_hours if profile and getattr(profile, "last_known_weekly_hours", None) else DEFAULT_WEEKLY_HOURS

    # 7. Identify unmastered gap skills
    gap_skills = [
        s for s in company_profile["priority_skills"]
        if snapshots.get(s, 0.0) < READINESS_THRESHOLD
    ]

    now = datetime.now(timezone.utc)
    days_remaining = max(0, (drive_date.date() - now.date()).days)
    weeks_available = max(1, days_remaining // 7)

    # 8. Feasibility & Stress Index
    total_gap_hours = len(gap_skills) * DEFAULT_SKILL_HOURS
    total_available_hours = weeks_available * weekly_study_hours
    is_feasible = total_available_hours >= total_gap_hours

    sprint_weeks = _build_sprint_weeks(
        gap_skills=gap_skills,
        all_priority_skills=company_profile["priority_skills"],
        focus_areas=company_profile["focus_areas"],
        drive_date=drive_date,
        weekly_hours=weekly_study_hours,
    )

    if is_feasible:
        recommendation = (
            f"At {weekly_study_hours:.0f} hrs/week, you have sufficient study time to cover all "
            f"{len(gap_skills)} gap skill(s) before {payload.drive_date} for {company_profile['name']}."
        )
    else:
        shortfall = math.ceil((total_gap_hours - total_available_hours) / weekly_study_hours)
        recommendation = (
            f"⚠️ Tight timeline for {company_profile['name']}! You need ~{total_gap_hours:.0f} hours but have ~{total_available_hours:.0f} "
            f"available. Consider increasing to {weekly_study_hours + shortfall:.0f} hrs/week."
        )

    if total_available_hours > 0:
        stress_index_pct = round((total_gap_hours / total_available_hours) * 100, 1)
    else:
        stress_index_pct = 999.9

    return PlacementPlanReport(
        profile_id=payload.profile_id,
        company_name=company_profile["name"],
        target_role=target_role,
        drive_date=payload.drive_date,
        days_remaining=days_remaining,
        weeks_available=weeks_available,
        is_feasible=is_feasible,
        weekly_study_hours=weekly_study_hours,
        total_gap_hours=total_gap_hours,
        stress_index_pct=stress_index_pct,
        gap_skills=list(gap_skills),
        sprint_weeks=sprint_weeks,
        overall_recommendation=recommendation,
        market_signals=market_signals
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
        stmt = select(ReadinessSnapshot).where(ReadinessSnapshot.profile_id == pid)
        snaps = (await db.execute(stmt)).scalars().all()
        if not snaps:
            continue

        mastered = [s for s in snaps if s.readiness_score >= READINESS_THRESHOLD]
        gap_count = len(snaps) - len(mastered)
        avg_readiness = sum(s.readiness_score for s in snaps) / len(snaps)

        in_breakthrough_zone = 0.80 <= avg_readiness <= 0.95
        proximity_bonus = 1.5 if in_breakthrough_zone else 1.0

        urgency_factor = 0.0
        if days_until_drive is not None and days_until_drive > 0:
            days_needed = gap_count * DEFAULT_SKILL_HOURS / DEFAULT_WEEKLY_HOURS * 7
            urgency_factor = max(0.0, min(1.0, 1.0 - (days_needed / days_until_drive)))

        triage_score = round(avg_readiness * (1.0 + urgency_factor) * proximity_bonus, 4)

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

    queue_entries.sort(key=lambda e: -e.triage_score)

    logger.info(
        f"[PlacementEngine/Triage] generated queue for {len(queue_entries)} learners, "
        f"drive_date={payload.drive_date}"
    )

    return MentorTriageReport(
        generated_at=now.isoformat(),
        queue=queue_entries,
    )
