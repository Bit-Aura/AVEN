import logging
import math
import hashlib
from typing import List, Any, Dict
from sqlalchemy import select
from app.models.domain import SkillRecord
from app.infrastructure.ai.gateway import AIProvider
from app.infrastructure.neo4j.client import Neo4jClient

logger = logging.getLogger(__name__)

# Lazy-loaded embedding model to minimize startup memory overhead
_model = None

class FallbackEmbeddingModel:
    """
    Lightweight deterministic 384-dimensional unit vector generator
    used as fallback when sentence-transformers is not available.
    """
    def encode(self, text: str, convert_to_numpy: bool = True):
        h = hashlib.sha256(text.encode("utf-8")).hexdigest()
        vec = []
        for i in range(384):
            val = (int(h[(i % 64)], 16) - 7.5) / 7.5
            vec.append(float(val))
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        normalized = [x / norm for x in vec]

        class VectorResult(list):
            def tolist(self):
                return self

        return VectorResult(normalized)

def get_embedding_model():
    """
    Lazy loads and returns the SentenceTransformer model with fallback.
    """
    global _model
    if _model is None:
        import os
        # Render free tier (512MB RAM) will OOM crash if we load PyTorch
        if os.getenv("RENDER") or os.getenv("DISABLE_PYTORCH"):
            logger.info("[Semantic Mapper] Render environment detected; using FallbackEmbeddingModel to prevent OOM crash")
            _model = FallbackEmbeddingModel()
            return _model
            
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("[Semantic Mapper] Successfully loaded SentenceTransformer (all-MiniLM-L6-v2)")
        except ImportError:
            logger.warning("[Semantic Mapper] sentence-transformers not installed; using FallbackEmbeddingModel")
            _model = FallbackEmbeddingModel()
        except Exception as e:
            logger.warning(f"[Semantic Mapper] Could not initialize SentenceTransformer ({e}); using FallbackEmbeddingModel")
            _model = FallbackEmbeddingModel()
    return _model

async def find_relevant_skills(
    intent: str,
    db_session: Any,
    ai_provider: AIProvider,
    neo4j_client: Neo4jClient
) -> List[Dict[str, Any]]:
    """
    Finds skills relevant to the user intent using PostgreSQL pgvector indexed cosine similarity.
    Pre-computed embeddings in the PostgreSQL `skills` table are queried directly, avoiding
    expensive in-memory embedding computations on every query.
    
    Args:
        intent (str): The user's parsed goal or context query.
        db_session: Async database session.
        ai_provider (AIProvider): Gateway to AI/LLM operations.
        neo4j_client (Neo4jClient): Neo4j database client.
        
    Returns:
        List[Dict[str, Any]]: A list of matched Skill details, sorted by similarity score descending.
    """
    # 1. Embed the query/intent once
    model = get_embedding_model()
    intent_emb = model.encode(intent, convert_to_numpy=True).tolist()

    # 2. Query PostgreSQL skills table using pgvector cosine distance
    if db_session:
        try:
            distance_expr = SkillRecord.embedding.cosine_distance(intent_emb)
            stmt = (
                select(SkillRecord, distance_expr.label("distance"))
                .order_by("distance")
                .limit(10)
            )
            result = await db_session.execute(stmt)
            rows = result.all()
            
            matched_skills = []
            
            # Calculate dynamic threshold based on variance/mean of top k distances
            dynamic_threshold = 0.25
            if rows:
                distances = [float(d) for _, d in rows if d is not None]
                if distances:
                    mean_dist = sum(distances) / len(distances)
                    dynamic_threshold = max(0.20, 1.0 - mean_dist - 0.05)

            for skill_rec, distance in rows:
                similarity = 1.0 - float(distance) if distance is not None else 0.0
                if similarity >= dynamic_threshold: # Dynamic threshold for semantic relevance
                    matched_skills.append({
                        "id": skill_rec.id,
                        "name": skill_rec.name,
                        "description": skill_rec.description or "",
                        "similarity": round(similarity, 4),
                        "bkt": {
                            "p_l0": skill_rec.bkt_p_l0,
                            "p_t": skill_rec.bkt_p_t,
                            "p_s": skill_rec.bkt_p_s,
                            "p_g": skill_rec.bkt_p_g
                        }
                    })
            if matched_skills:
                return matched_skills
        except Exception:
            pass

    # 3. Fallback: Query Neo4j if database query encounters an issue
    query = "MATCH (s:Skill) RETURN s.id AS id, s.name AS name, s.description AS description"
    try:
        def fetch_skills_sync():
            local_skills = []
            with neo4j_client.driver.session() as session:
                result = session.run(query)
                for record in result:
                    local_skills.append({
                        "id": record["id"],
                        "name": record["name"],
                        "description": record["description"] or "",
                        "similarity": 0.50
                    })
            return local_skills
            
        import asyncio
        skills = await asyncio.to_thread(fetch_skills_sync)
    except Exception:
        return []

    return skills

