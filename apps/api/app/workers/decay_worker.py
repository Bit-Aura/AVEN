"""
Active Background Worker for Ebbinghaus Forgetting Curve Skill Decay.
Periodically scans learner profiles and decays readiness snapshots based on elapsed time.
"""
import asyncio
import logging
from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import LearnerProfile
from app.services.path_planner import check_skill_decay

logger = logging.getLogger(__name__)

async def run_active_decay_for_all(db: AsyncSession) -> Dict[str, Any]:
    """
    Actively triggers Ebbinghaus forgetting curve decay calculations across all learner profiles.
    """
    stmt = select(LearnerProfile)
    result = await db.execute(stmt)
    profiles = result.scalars().all()
    
    decay_report = {}
    total_decayed_skills = 0
    
    for profile in profiles:
        decayed = await check_skill_decay(profile.id, db)
        if decayed:
            decay_report[profile.id] = decayed
            total_decayed_skills += len(decayed)
            
    await db.commit()
    logger.info(f"Active skill decay completed for {len(profiles)} profiles ({total_decayed_skills} skills updated).")
    
    return {
        "status": "success",
        "profiles_scanned": len(profiles),
        "profiles_decayed": len(decay_report),
        "total_skills_decayed": total_decayed_skills,
        "details": decay_report
    }

async def background_decay_task(session_factory, interval_seconds: int = 86400):
    """
    Continuous background loop that performs decay calculations at regular intervals.
    """
    logger.info(f"Starting Background Decay Scheduler (interval: {interval_seconds}s)...")
    while True:
        try:
            async with session_factory() as db:
                await run_active_decay_for_all(db)
        except Exception as e:
            logger.error(f"Error in background decay scheduler loop: {e}")
        await asyncio.sleep(interval_seconds)
