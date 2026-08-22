"""
Semantic mapping service using sentence-transformers and Neo4j.
"""
from typing import List, Any
import numpy as np
from sentence_transformers import SentenceTransformer
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
) -> List[Any]:
    """
    Finds skills relevant to the user intent using pgvector-like cosine similarity in python on Neo4j skill nodes.
    
    Args:
        intent (str): The user's parsed goal or context query.
        db_session: Async database session.
        ai_provider (AIProvider): Gateway to AI/LLM operations.
        neo4j_client (Neo4jClient): Neo4j database client.
        
    Returns:
        List[Any]: A list of matched Skill details, sorted by similarity score descending.
    """
    # 1. Fetch all skill nodes from Neo4j
    query = "MATCH (s:Skill) RETURN s.id AS id, s.name AS name, s.description AS description"
    skills = []
    try:
        with neo4j_client.driver.session() as session:
            result = session.run(query)
            for record in result:
                skills.append({
                    "id": record["id"],
                    "name": record["name"],
                    "description": record["description"] or ""
                })
    except Exception:
        # Fallback if Neo4j is offline or empty
        return []

    if not skills:
        return []

    # 2. Embed the intent text
    model = get_embedding_model()
    intent_emb = model.encode(intent, convert_to_numpy=True)

    # 3. Embed all skill names + description text
    skill_texts = [f"{s['name']}: {s['description']}" for s in skills]
    skill_embs = model.encode(skill_texts, convert_to_numpy=True)

    # 4. Calculate cosine similarities: dot(A, B) / (norm(A) * norm(B))
    dot_products = np.dot(skill_embs, intent_emb)
    skill_norms = np.linalg.norm(skill_embs, axis=1)
    intent_norm = np.linalg.norm(intent_emb)

    similarities = dot_products / (skill_norms * intent_norm + 1e-8)

    # 5. Filter skills matching a minimum semantic threshold (e.g. 0.30)
    matched_skills = []
    for i, skill in enumerate(skills):
        similarity_score = float(similarities[i])
        if similarity_score >= 0.30:
            skill_copy = skill.copy()
            skill_copy["similarity"] = similarity_score
            matched_skills.append(skill_copy)

    # Sort matches by similarity descending
    matched_skills.sort(key=lambda x: x["similarity"], reverse=True)
    return matched_skills
