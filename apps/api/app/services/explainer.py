"""
Explanation generator using AIProvider and Neo4j.
"""
from typing import Dict, Any, Optional
from app.infrastructure.ai.gateway import AIProvider
from app.infrastructure.neo4j.client import Neo4jClient

async def explain_recommendation(
    skill_name: str,
    resource_title: str,
    ai_provider: AIProvider,
    neo4j_client: Neo4jClient,
    decision_trace: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generates a brief explanation of why a resource is recommended for a skill.
    
    Args:
        skill_name (str): The name of the target skill.
        resource_title (str): The recommended resource title.
        ai_provider (AIProvider): Gateway to AI/LLM operations.
        neo4j_client (Neo4jClient): Neo4j database client.
        decision_trace (Optional[Dict[str, Any]]): The trace containing reasons for ranking/selection.
        
    Returns:
        str: Grounded explanation for the user.
    """
    trace = decision_trace or {}
    
    # Enrich decision trace by querying Neo4j for target skill metadata (e.g. description, prerequisites)
    query = """
    MATCH (s:Skill {name: $skill_name})
    OPTIONAL MATCH (pre:Skill)-[:PREREQUISITE_OF]->(s)
    RETURN s.description AS description, collect(pre.name) AS prerequisites
    """
    try:
        def fetch_trace_sync():
            with neo4j_client.driver.session() as session:
                return session.run(query, {"skill_name": skill_name}).single()
        
        import asyncio
        result = await asyncio.to_thread(fetch_trace_sync)
        if result:
            trace["skill_description"] = result["description"] or ""
            trace["skill_prerequisites"] = list(result["prerequisites"])
    except Exception as e:
        # Fallback if Neo4j query fails
        trace["skill_description"] = f"Skill: {skill_name}"
        trace["neo4j_error"] = str(e)
        
    # Delegate explanation generation to AI provider using the enriched trace
    return await ai_provider.explain_decision(skill_name, resource_title, decision_trace=trace)
