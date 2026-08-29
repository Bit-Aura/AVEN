import logging
import asyncio
from sqlalchemy import text, select, func
from app.models.base import Base
from app.models.domain import User, LearnerProfile, ReadinessSnapshot, HackathonEvent
from app.core.auth import ensure_default_admin, hash_password

logger = logging.getLogger(__name__)

async def run_startup_seeding(engine, async_session_maker, neo4j_client=None):
    """
    Background worker function to initialize tables and seed databases
    without blocking FastAPI startup.
    """
    try:
        # Create Extensions and Tables
        try:
            async with engine.connect() as conn:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                await conn.commit()
        except Exception:
            pass
            
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE learner_profiles ADD COLUMN last_known_weekly_hours FLOAT DEFAULT 10.0"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE hackathon_events ADD COLUMN city VARCHAR(255)"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE hackathon_events ADD COLUMN state VARCHAR(255)"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE hackathon_events ADD COLUMN country VARCHAR(255)"))
            except Exception:
                pass

        async with async_session_maker() as session:
            # 1. Seed Default Admin
            await ensure_default_admin(session)

            # 2. Seed Demo Learner
            stmt = select(User).where(User.email == "demo@pathfinder.dev")
            user = (await session.execute(stmt)).scalars().first()
            if not user:
                user = User(
                    clerk_id="clerk_demo_user",
                    email="demo@pathfinder.dev",
                    password_hash=hash_password("Aven@123"),
                    name="Demo Learner",
                    role="LEARNER",
                    is_active=True,
                )
                session.add(user)
                await session.flush()
                profile = LearnerProfile(user_id=user.id, current_context="Backend Software Engineer")
                session.add(profile)
                await session.flush()
                
                for skill in ["python_basics", "sql_basics", "git_foundations", "http_methods"]:
                    session.add(ReadinessSnapshot(profile_id=profile.id, skill_id=skill, readiness_score=0.85))
            else:
                user.role = "LEARNER"
                if not user.password_hash:
                    user.password_hash = hash_password("Aven@123")
                
            # 3. Seed Platform Admin
            stmt_admin = select(User).where(User.email == "admin@pathfinder.dev")
            admin_user = (await session.execute(stmt_admin)).scalars().first()
            if not admin_user:
                admin_user = User(
                    clerk_id="clerk_admin_user",
                    email="admin@pathfinder.dev",
                    password_hash=hash_password("Aven@123"),
                    name="Platform Administrator",
                    role="ADMIN",
                    is_active=True,
                )
                session.add(admin_user)
                await session.flush()
                session.add(LearnerProfile(user_id=admin_user.id, current_context="Platform Administrator"))
            elif admin_user:
                admin_user.role = "ADMIN"
                if not admin_user.password_hash:
                    admin_user.password_hash = hash_password("Aven@123")
                
            # 4. Seed Approved Mentor User
            stmt_mentor = select(User).where(User.email == "mentor@pathfinder.dev")
            mentor_user = (await session.execute(stmt_mentor)).scalars().first()
            if not mentor_user:
                mentor_user = User(
                    clerk_id="clerk_mentor_user",
                    email="mentor@pathfinder.dev",
                    password_hash=hash_password("Aven@123"),
                    name="Lead Mentor",
                    role="MENTOR",
                    is_active=True,
                )
                session.add(mentor_user)
                await session.flush()
                session.add(LearnerProfile(user_id=mentor_user.id, current_context="Senior Systems Engineer"))
            else:
                mentor_user.role = "MENTOR"
                if not mentor_user.password_hash:
                    mentor_user.password_hash = hash_password("Aven@123")
                
            await session.commit()
            
            # 5. Seed Neo4j & Postgres skills topology
            for seed_attempt in range(3):
                try:
                    from app.services.seeder import seed_all
                    await seed_all(session, neo4j_client)
                    break
                except Exception as seed_err:
                    logger.warning(f"[Startup Seeding] Skill seeding attempt {seed_attempt + 1} failed: {seed_err}")
                    if seed_attempt == 2:
                        logger.error("[Startup Seeding] Skill seeding failed completely.")
                    await asyncio.sleep(2)
                
            # 6. Background event scraping
            event_count = (await session.execute(select(func.count(HackathonEvent.id)))).scalar_one()
            if event_count < 50:
                logger.info("[Startup Seeding] Database low on events. Starting background scraping feed...")
                try:
                    from app.scraper.event_pipeline import EventScrapingPipeline
                    pipeline = EventScrapingPipeline()
                    # Run these slowly or concurrently in the background without blocking the main event loop
                    async def fetch_events():
                        for source_key in pipeline.sources.keys():
                            for scrape_attempt in range(3):
                                try:
                                    logger.info(f"[Startup Seeding] Fetching {source_key} (Attempt {scrape_attempt+1})...")
                                    # Create a new session context per source for safety
                                    async with async_session_maker() as scrape_session:
                                        await pipeline.scrape_source(source_key, "all", db=scrape_session)
                                    await asyncio.sleep(2) # Prevent hammering external APIs aggressively
                                    break
                                except Exception as scrape_err:
                                    logger.warning(f"[Startup Seeding] Hackathon scrape for '{source_key}' encountered error: {scrape_err}")
                                    await asyncio.sleep(2 ** scrape_attempt)
                    
                    # Store task reference to avoid being garbage collected
                    bg_task = asyncio.create_task(fetch_events())
                    bg_task.add_done_callback(lambda t: logger.info(f"Background scraping task completed with error: {t.exception()}" if t.exception() else "Background scraping task completed successfully."))
                except Exception as e:
                    logger.error(f"[Startup Seeding] Event pipeline error: {e}")

            logger.info("[Startup Seeding] Successfully completed startup database initialization.")
    except Exception as e:
        logger.warning(f"[Startup Seeding] Database initialization warning: {e}")
