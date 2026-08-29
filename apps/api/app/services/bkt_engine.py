import logging
import math
from datetime import datetime, timezone
from typing import Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import SkillRecord, ReadinessSnapshot
from app.infrastructure.neo4j.client import Neo4jClient
from app.db.repositories.skill_repo import SkillRepository
from app.infrastructure.neo4j.repositories import Neo4jSkillRepository

logger = logging.getLogger(__name__)

# Default Fallback BKT Constants
DEFAULT_BKT_PRIOR = 0.15
DEFAULT_BKT_TRANSITION = 0.20
DEFAULT_BKT_SLIP = 0.10
DEFAULT_BKT_GUESS = 0.20

# Forgetting Curve / Decay Constant (Stability in days)
DECAY_STABILITY_DAYS = 30.0

async def get_skill_bkt_params(skill_id: str, db: AsyncSession, neo4j_client: Optional[Neo4jClient] = None) -> Dict[str, float]:
    pg_repo = SkillRepository(db)
    
    # Try Postgres First
    bkt_params = await pg_repo.get_skill_bkt_params(skill_id)
    if bkt_params:
        return bkt_params

    # Try Neo4j Fallback
    if neo4j_client:
        neo4j_repo = Neo4jSkillRepository(neo4j_client)
        bkt_params = neo4j_repo.get_skill_bkt_params(skill_id)
        if bkt_params:
            return bkt_params

    return {
        "p_l0": DEFAULT_BKT_PRIOR,
        "p_t": DEFAULT_BKT_TRANSITION,
        "p_s": DEFAULT_BKT_SLIP,
        "p_g": DEFAULT_BKT_GUESS
    }

async def update_bkt_score(
    profile_id: int,
    skill_id: str,
    is_correct: bool,
    db: AsyncSession,
    neo4j_client: Optional[Neo4jClient] = None,
    attempt_time_sec: float = 0.0,
    attempted: bool = True
) -> float:
    bkt = await get_skill_bkt_params(skill_id, db, neo4j_client)
    
    # 1. Enforce strict Corbett & Anderson Constraints (Degeneracy Prevention)
    p_slip = min(bkt["p_s"], 0.099)
    p_guess = min(bkt["p_g"], 0.299)
    p_trans = bkt["p_t"]
    p_prior = bkt["p_l0"]

    stmt = select(ReadinessSnapshot).where(
        ReadinessSnapshot.profile_id == profile_id,
        ReadinessSnapshot.skill_id == skill_id
    )
    result = await db.execute(stmt)
    snapshot = result.scalars().first()
    
    current_p = snapshot.readiness_score if snapshot else p_prior
    
    # 2. Time-Dependent BKT (TD-BKT) for long-running simulators
    if not attempted:
        # Do not punish long, deliberate problem-solving. Scale transition by time invested.
        time_factor = min(attempt_time_sec / 3600.0, 1.0) 
        new_p = current_p + (1.0 - current_p) * (p_trans * time_factor)
    else:
        # Standard update
        if is_correct:
            numerator = current_p * (1.0 - p_slip)
            denominator = numerator + (1.0 - current_p) * p_guess
        else:
            numerator = current_p * p_slip
            denominator = numerator + (1.0 - current_p) * (1.0 - p_guess)
            
        p_mastered_given_obs = numerator / (denominator + 1e-8)
        new_p = p_mastered_given_obs + (1.0 - p_mastered_given_obs) * p_trans
        
    # Clamp bounds strictly
    new_p = max(0.01, min(0.99, new_p))
    
    if snapshot:
        snapshot.readiness_score = new_p
        snapshot.last_updated = datetime.now(timezone.utc)
    else:
        snapshot = ReadinessSnapshot(
            profile_id=profile_id,
            skill_id=skill_id,
            readiness_score=new_p,
            last_updated=datetime.now(timezone.utc)
        )
        db.add(snapshot)
        
    await db.flush()
    return round(new_p, 4)

async def check_skill_decay(
    profile_id: int,
    db: AsyncSession
) -> Dict[str, float]:
    stmt = select(ReadinessSnapshot).where(ReadinessSnapshot.profile_id == profile_id)
    result = await db.execute(stmt)
    snapshots = result.scalars().all()
    
    decayed_skills = {}
    now = datetime.now(timezone.utc)
    
    for s in snapshots:
        elapsed_days = (now - s.last_updated.replace(tzinfo=timezone.utc)).total_seconds() / 86400.0
        if elapsed_days <= 0:
            continue
            
        retention = math.exp(-elapsed_days / DECAY_STABILITY_DAYS)
        new_score = s.readiness_score * retention
        new_score = max(0.01, round(new_score, 4))
        
        if new_score < s.readiness_score - 0.05:
            s.readiness_score = new_score
            s.last_updated = now
            decayed_skills[s.skill_id] = new_score
            
    if decayed_skills:
        await db.flush()
        
    return decayed_skills
