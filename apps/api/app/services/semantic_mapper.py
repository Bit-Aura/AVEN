from typing import List, Any, Dict
from sqlalchemy import select
from sentence_transformers import SentenceTransformer
from app.models.domain import SkillRecord
from app.infrastructure.ai.gateway import AIProvider
from app.infrastructure.neo4j.client import Neo4jClient

# Lazy-loaded embedding model to minimize startup memory overhead
_model = None

def get_embedding_model() -> SentenceTransformer:
    """
    Lazy loads and returns the SentenceTransformer model.
    """
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
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
            for skill_rec, distance in rows:
                similarity = 1.0 - float(distance) if distance is not None else 0.0
                if similarity >= 0.25: # Threshold for semantic relevance
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
    skills = []
    try:
        with neo4j_client.driver.session() as session:
            result = session.run(query)
            for record in result:
                skills.append({
                    "id": record["id"],
                    "name": record["name"],
                    "description": record["description"] or "",
                    "similarity": 0.50
                })
    except Exception:
        return []

    return skills

