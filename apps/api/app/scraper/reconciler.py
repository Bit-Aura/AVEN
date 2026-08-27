import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import SkillRecord, RoadmapIngestionConflict

logger = logging.getLogger(__name__)

async def reconcile_scraped_skill_terms(
    job_id: str,
    company: str,
    extracted_skill_terms: List[str],
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Reconciles scraped ATS job skill requirements against canonical roadmap.sh-backed skill records.
    If an extracted skill term does not match any existing skill in Postgres/Neo4j,
    queues an `unmapped_market_skill` conflict entry in `roadmap_ingestion_conflicts`
    instead of auto-creating a new skill node.
    """
    matched_skills = []
    unmapped_terms = []

    # Fetch all canonical skill records
    stmt = select(SkillRecord)
    all_skills = (await db.execute(stmt)).scalars().all()
    skill_map = {s.name.lower(): s.id for s in all_skills}
    skill_id_set = {s.id.lower() for s in all_skills}

    for term in extracted_skill_terms:
        clean_term = term.strip().lower()
        if not clean_term:
            continue

        if clean_term in skill_map:
            matched_skills.append(skill_map[clean_term])
        elif clean_term in skill_id_set:
            matched_skills.append(clean_term)
        else:
            # Check partial or substring match
            found_id = None
            for name, s_id in skill_map.items():
                if clean_term in name or name in clean_term:
                    found_id = s_id
                    break

            if found_id:
                matched_skills.append(found_id)
            else:
                unmapped_terms.append(term)

    # Queue unmapped terms into roadmap_ingestion_conflicts
    if unmapped_terms:
        conflict = RoadmapIngestionConflict(
            slug=None,
            conflict_type="unmapped_market_skill",
            payload={
                "job_id": job_id,
                "company": company,
                "unmapped_terms": unmapped_terms,
                "matched_skills_count": len(matched_skills)
            },
            resolved=False
        )
        db.add(conflict)
        await db.commit()
        logger.info(f"[ScraperReconciler] Queued {len(unmapped_terms)} unmapped market skill terms from job {job_id} ({company}).")

    return {
        "job_id": job_id,
        "matched_skill_ids": matched_skills,
        "unmapped_terms": unmapped_terms,
        "conflicts_queued": 1 if unmapped_terms else 0
    }
