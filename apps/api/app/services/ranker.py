"""
Resource ranking service using AIProvider and Neo4j.
"""
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models import Resource
from app.models.domain import ResourceMetadata
from app.infrastructure.ai.gateway import AIProvider
from app.infrastructure.neo4j.client import Neo4jClient

async def rank_resources_for_skill(
    skill_id: str,
    user_profile: Dict[str, Any],
    ai_provider: AIProvider,
    neo4j_client: Neo4jClient,
    db_session: Any = None
) -> List[Resource]:
    """
    Ranks available resources for a specific skill based on user profile and Neo4j prerequisite graph.
    
    Args:
        skill_id (str): The skill ID/name to learn.
        user_profile (Dict[str, Any]): Current user profile/context. Contains preferences and slider weights.
        ai_provider (AIProvider): Gateway to AI/LLM operations.
        neo4j_client (Neo4jClient): Neo4j database client.
        db_session (AsyncSession): SQLAlchemy async database session.
        
    Returns:
        List[Resource]: Ranked list of resources.
    """
    if db_session is None:
        return []

    # 1. Try to fetch resources explicitly tagged with this skill_id (approved only)
    stmt = (
        select(Resource)
        .join(ResourceMetadata)
        .where(
            ResourceMetadata.key == "skill_id",
            ResourceMetadata.value == skill_id,
            Resource.status == "APPROVED"
        )
        .options(selectinload(Resource.metadata_relations))
    )
    result = await db_session.execute(stmt)
    resources = list(result.scalars().all())

    # 2. Fallback: If no tagged resources, perform a pgvector semantic search using similarity (approved only)
    if not resources:
        try:
            from app.services.semantic_mapper import get_embedding_model
            model = get_embedding_model()
            query_vector = model.encode(skill_id).tolist()
            
            # Use cosine distance to order resources
            stmt = (
                select(Resource)
                .where(Resource.status == "APPROVED")
                .order_by(Resource.embedding.cosine_distance(query_vector))
                .limit(5)
                .options(selectinload(Resource.metadata_relations))
            )
            result = await db_session.execute(stmt)
            resources = list(result.scalars().all())
        except Exception:
            # If embedding fails, fetch approved resources
            stmt = select(Resource).where(Resource.status == "APPROVED").limit(10).options(selectinload(Resource.metadata_relations))
            result = await db_session.execute(stmt)
            resources = list(result.scalars().all())

    # 3. Rank resources based on user preferences and slider weights
    preferred_modality = user_profile.get("preferred_modality", "project")
    weights = user_profile.get("weights", {"speed": 0.5, "depth": 0.5, "cost": 0.5})

    ranked_list = []
    for r in resources:
        meta = {m.key: m.value for m in r.metadata_relations}
        modality = meta.get("modality", "text")
        cost = meta.get("cost", "free")
        
        try:
            duration = float(meta.get("duration_minutes", 30))
        except ValueError:
            duration = 30.0
            
        try:
            depth = float(meta.get("depth", 0.5))
        except ValueError:
            depth = 0.5

        # Initialize matching score
        score = 0.0

        # Modality match
        if modality == preferred_modality:
            score += 3.0

        # Sliders processing:
        # - Speed: higher weight prefers shorter resources
        speed_weight = weights.get("speed", 0.5)
        if speed_weight > 0.5:
            score += ((120.0 - min(duration, 120.0)) / 12.0) * speed_weight
        else:
            score += (min(duration, 120.0) / 12.0) * (1.0 - speed_weight)

        # - Depth: higher weight prefers deeper/longer materials
        depth_weight = weights.get("depth", 0.5)
        score += depth * depth_weight * 5.0

        # - Cost: higher weight prefers free resources
        cost_weight = weights.get("cost", 0.5)
        if cost == "free":
            score += cost_weight * 4.0

        ranked_list.append((r, score))

    # Sort resources by final score in descending order
    ranked_list.sort(key=lambda x: x[1], reverse=True)
    return [item[0] for item in ranked_list]
