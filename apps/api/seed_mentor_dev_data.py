"""
Explicit Development Seed Script for Mentor Intervention Hub.
Run manually in development/staging: python seed_mentor_dev_data.py
"""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.db import async_session
from app.models.domain import (
    User,
    LearnerProfile,
    ReadinessSnapshot,
    Cohort,
    CohortMember,
    PlacementDrive,
    AssessmentItem,
    AssessmentAttempt,
    CodingSandboxSubmission,
    AiCoachEscalation,
)

async def seed_mentor_data():
    async with async_session() as session:
        print("[Seed] Seeding Mentor Hub development data...")

        # 1. Create or retrieve Default Cohort
        stmt_cohort = select(Cohort).where(Cohort.name == "Fall 2026 SDE Cohort")
        cohort = (await session.execute(stmt_cohort)).scalars().first()
        if not cohort:
            cohort = Cohort(
                name="Fall 2026 SDE Cohort",
                description="Core software engineering bootcamp track preparing for placement season.",
                institution="AVEN Accelerator",
                is_active=True,
            )
            session.add(cohort)
            await session.flush()
            print(f"[Seed] Created cohort: {cohort.name} (id={cohort.id})")

        # 2. Create Placement Drives for the cohort
        target_date_1 = (datetime.now(timezone.utc) + timedelta(days=25)).strftime("%Y-%m-%d")
        target_date_2 = (datetime.now(timezone.utc) + timedelta(days=40)).strftime("%Y-%m-%d")

        stmt_drive = select(PlacementDrive).where(PlacementDrive.cohort_id == cohort.id)
        existing_drives = (await session.execute(stmt_drive)).scalars().all()

        if not existing_drives:
            drive1 = PlacementDrive(
                cohort_id=cohort.id,
                company_name="Google",
                role_title="Software Engineer III / SDE II",
                target_date=target_date_1,
                required_skills=["python_advanced", "async_python", "system_design", "api_design", "python_basics", "http_fundamentals"],
                readiness_threshold=0.75,
                is_active=True,
            )
            drive2 = PlacementDrive(
                cohort_id=cohort.id,
                company_name="Amazon",
                role_title="Software Development Engineer I / II",
                target_date=target_date_2,
                required_skills=["python_basics", "system_design", "db_design", "api_design", "async_python", "postgres_advanced"],
                readiness_threshold=0.70,
                is_active=True,
            )
            session.add_all([drive1, drive2])
            await session.flush()
            print("[Seed] Created placement drives: Google, Amazon")

        # 3. Create Sample Learners with diverse readiness and struggle patterns
        sample_learners = [
            {
                "email": "learner_surya@pathfinder.dev",
                "name": "Surya Kumar",
                "role": "Distributed Systems Dev",
                "readiness": {
                    "python_advanced": 0.90, "async_python": 0.88, "system_design": 0.85,
                    "api_design": 0.86, "python_basics": 0.95, "http_fundamentals": 0.82
                },  # Avg ~ 0.88 (Breakthrough Zone!)
                "struggle": None,
            },
            {
                "email": "learner_priya@pathfinder.dev",
                "name": "Priya Sharma",
                "role": "Backend Engineer",
                "readiness": {
                    "python_advanced": 0.70, "async_python": 0.65, "system_design": 0.55,
                    "api_design": 0.60, "python_basics": 0.80, "http_fundamentals": 0.72
                },
                "struggle": "assessment_repeated",
            },
            {
                "email": "learner_alex@pathfinder.dev",
                "name": "Alex Chen",
                "role": "Full-Stack SDE",
                "readiness": {
                    "python_advanced": 0.96, "async_python": 0.94, "system_design": 0.92,
                    "api_design": 0.95, "python_basics": 0.98, "http_fundamentals": 0.96
                },  # > 0.95 (Placement Ready)
                "struggle": None,
            },
            {
                "email": "learner_marcus@pathfinder.dev",
                "name": "Marcus Vance",
                "role": "Cloud Infrastructure Dev",
                "readiness": {
                    "python_advanced": 0.50, "async_python": 0.45, "system_design": 0.40,
                    "api_design": 0.52, "python_basics": 0.60, "http_fundamentals": 0.55
                },
                "struggle": "high_thrash",
            }
        ]

        for sl in sample_learners:
            stmt_u = select(User).where(User.email == sl["email"])
            u = (await session.execute(stmt_u)).scalars().first()
            if not u:
                u = User(
                    clerk_id=f"clerk_{sl['email'].replace('@', '_').replace('.', '_')}",
                    email=sl["email"],
                    name=sl["name"],
                    role="learner",
                    is_active=True,
                )
                session.add(u)
                await session.flush()
                prof = LearnerProfile(user_id=u.id, current_context=sl["role"])
                session.add(prof)
                await session.flush()
            else:
                stmt_p = select(LearnerProfile).where(LearnerProfile.user_id == u.id)
                prof = (await session.execute(stmt_p)).scalars().first()

            # Ensure Cohort Membership
            stmt_mem = select(CohortMember).where(
                CohortMember.cohort_id == cohort.id,
                CohortMember.profile_id == prof.id,
            )
            mem = (await session.execute(stmt_mem)).scalars().first()
            if not mem:
                session.add(CohortMember(cohort_id=cohort.id, profile_id=prof.id, is_active=True))

            # Set Readiness Snapshots
            for skill_k, score_v in sl["readiness"].items():
                stmt_rs = select(ReadinessSnapshot).where(
                    ReadinessSnapshot.profile_id == prof.id,
                    ReadinessSnapshot.skill_id == skill_k,
                )
                rs = (await session.execute(stmt_rs)).scalars().first()
                if not rs:
                    session.add(ReadinessSnapshot(profile_id=prof.id, skill_id=skill_k, readiness_score=score_v))
                else:
                    rs.readiness_score = score_v

            # Add struggle telemetry if applicable
            if sl["struggle"] == "assessment_repeated":
                # Create a sample assessment item and 2 failed attempts
                stmt_item = select(AssessmentItem).where(AssessmentItem.title == "System Design Sharding")
                item = (await session.execute(stmt_item)).scalars().first()
                if not item:
                    item = AssessmentItem(title="System Design Sharding", content="Explain consistent hashing.", difficulty="intermediate")
                    session.add(item)
                    await session.flush()
                session.add(AssessmentAttempt(profile_id=prof.id, assessment_item_id=item.id, score=0.3, is_correct=False))
                session.add(AssessmentAttempt(profile_id=prof.id, assessment_item_id=item.id, score=0.4, is_correct=False))

            elif sl["struggle"] == "high_thrash":
                session.add(CodingSandboxSubmission(
                    profile_id=prof.id,
                    node_id="async_python_concurrency",
                    problem_title="Async Semaphore Pipeline",
                    language="python",
                    submitted_code="async def worker(): pass",
                    score=0.2,
                    verdict="failed",
                    is_passing=False,
                    evaluation_result={"thrash_index": 0.78, "strategy": "RANDOM_THRASHING"},
                ))

        await session.commit()
        print("[Seed] Successfully seeded development cohort, placement drives, and real learners.")

if __name__ == "__main__":
    asyncio.run(seed_mentor_data())
