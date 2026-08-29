from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Optional
from app.models.domain import SkillRecord, ReadinessSnapshot

class SkillRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_skill_bkt_params(self, skill_id: str) -> Optional[Dict[str, float]]:
        stmt = select(SkillRecord).where(SkillRecord.id == skill_id)
        result = await self.db.execute(stmt)
        skill_rec = result.scalars().first()
        if skill_rec:
            return {
                "p_l0": skill_rec.bkt_p_l0,
                "p_t": skill_rec.bkt_p_t,
                "p_s": skill_rec.bkt_p_s,
                "p_g": skill_rec.bkt_p_g
            }
        return None

    async def get_ancestor_readiness(self, profile_id: int, ancestor_ids: List[str]) -> Dict[str, float]:
        stmt = select(ReadinessSnapshot).where(
            ReadinessSnapshot.profile_id == profile_id,
            ReadinessSnapshot.skill_id.in_(ancestor_ids)
        )
        result = await self.db.execute(stmt)
        return {s.skill_id: s.readiness_score for s in result.scalars().all()}
