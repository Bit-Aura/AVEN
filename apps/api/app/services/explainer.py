"""
Explanation generator using AIProvider and Neo4j.
"""
from app.infrastructure.ai.gateway import AIProvider
from app.infrastructure.neo4j.client import Neo4jClient

async def explain_recommendation(
    skill_name: str,
    resource_title: str,
    ai_provider: AIProvider,
    neo4j_client: Neo4jClient
) -> str:
    """
    Generates a brief explanation of why a resource is recommended for a skill.
    
    Args:
        skill_name (str): The name of the target skill.
        resource_title (str): The recommended resource title.
        ai_provider (AIProvider): Gateway to AI/LLM operations.
        neo4j_client (Neo4jClient): Neo4j database client.
        
    Returns:
        str: Grounded explanation for the user.
    """
    # TODO: Fetch skill info using neo4j_client, then ask ai_provider for decision explanation
    return await ai_provider.explain_decision(skill_name, resource_title)
