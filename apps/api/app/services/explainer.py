"""
Explanation generator using Anthropic for grounded RAG.
"""

async def explain_recommendation(skill_name: str, resource_title: str) -> str:
    """
    Generates a brief explanation of why a resource is recommended for a skill.
    
    Args:
        skill_name (str): The name of the target skill.
        resource_title (str): The recommended resource title.
        
    Returns:
        str: Grounded explanation for the user.
    """
    # TODO: Make an LLM call to Anthropic SDK to explain the mapping
    return "This resource covers the fundamentals of the requested skill."
