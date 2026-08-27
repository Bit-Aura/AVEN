"""
Background worker for periodic roadmap.sh cache and topology synchronization.
Runs on a scheduled background loop to check for roadmap updates while enforcing credit limits.
"""
import asyncio
import logging
from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import RoleRoadmapMapping, RoadmapCache
from app.services.roadmap_ingestion import roadmap_ingestion_service, RoadmapIngestionService

logger = logging.getLogger(__name__)

async def run_roadmap_sync_all(db: AsyncSession, force: bool = False) -> Dict[str, Any]:
    """
    Scans all registered role-roadmap mapping slugs and executes the ingestion pipeline.
    """
    logger.info("Starting background roadmap.sh topology synchronization...")

    # Fetch all mapped slugs
    stmt = select(RoleRoadmapMapping.roadmap_slug).distinct()
    slug_results = await db.execute(stmt)
    slugs = list(slug_results.scalars().all())

    # Fallback to core default slugs if table is empty
    if not slugs:
        slugs = ["backend", "python", "sql", "system-design", "frontend", "javascript", "react", "devops", "docker", "kubernetes", "mlops", "ai-engineer", "data-engineer"]

    summary = {
        "slugs_processed": len(slugs),
        "successful_slugs": [],
        "failed_slugs": [],
        "total_skills_upserted": 0,
        "total_edges_upserted": 0,
        "total_resources_extracted": 0,
        "total_credits_spent": 0
    }

    for slug in slugs:
        try:
            res = await roadmap_ingestion_service.sync_roadmap_slug(slug, db, force=force)
            if res["status"] == "success":
                summary["successful_slugs"].append(slug)
                summary["total_skills_upserted"] += res["skills_upserted"]
                summary["total_edges_upserted"] += res["edges_upserted"]
                summary["total_resources_extracted"] += res["resources_extracted"]
                summary["total_credits_spent"] += res["credits_spent"]
            else:
                summary["failed_slugs"].append({"slug": slug, "reason": res["status"]})
        except Exception as e:
            logger.error(f"[RoadmapSyncWorker] Error syncing slug '{slug}': {e}")
            summary["failed_slugs"].append({"slug": slug, "reason": str(e)})

    logger.info(f"Background roadmap sync completed: {len(summary['successful_slugs'])}/{len(slugs)} succeeded. Total credits: {summary['total_credits_spent']}.")
    return summary

async def background_roadmap_sync_task(session_factory, interval_seconds: int = 604800):
    """
    Continuous background loop that checks and syncs roadmap topologies periodically (default weekly: 7 days).
    """
    logger.info(f"Starting Background Roadmap Sync Scheduler (interval: {interval_seconds}s)...")
    while True:
        try:
            async with session_factory() as db:
                await run_roadmap_sync_all(db, force=False)
        except Exception as e:
            logger.error(f"Error in background roadmap sync scheduler loop: {e}")
        await asyncio.sleep(interval_seconds)
