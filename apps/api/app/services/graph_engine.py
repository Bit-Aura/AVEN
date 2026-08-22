"""
Graph engine for prerequisite resolution using NetworkX and Neo4j.
"""
from typing import List, Dict, Any
import logging
import networkx as nx
from app.infrastructure.ai.gateway import AIProvider
from app.infrastructure.neo4j.client import Neo4jClient

logger = logging.getLogger(__name__)

def build_skill_subgraph(
    skills: List[Dict[str, Any]],
    ai_provider: AIProvider,
    neo4j_client: Neo4jClient
) -> nx.DiGraph:
    """
    Builds a directed graph of skills and their prerequisites retrieved from Neo4j.
    
    Args:
        skills (List[Dict[str, Any]]): List of target skills to include in the path.
        ai_provider (AIProvider): Gateway to AI/LLM operations.
        neo4j_client (Neo4jClient): Neo4j database client.
        
    Returns:
        nx.DiGraph: Directed graph representing prerequisite paths.
    """
    G = nx.DiGraph()
    
    # 1. Fetch all skills from Neo4j to build nodes
    query_nodes = "MATCH (s:Skill) RETURN s.id AS id, s.name AS name, s.description AS description"
    node_map = {}
    try:
        with neo4j_client.driver.session() as session:
            result = session.run(query_nodes)
            for record in result:
                name = record["name"]
                node_map[name] = {
                    "id": record["id"],
                    "description": record["description"] or ""
                }
                G.add_node(name, **node_map[name])
    except Exception as e:
        logger.error(f"Error fetching skill nodes from Neo4j: {e}")
        return G

    # 2. Fetch all prerequisite relationships to build edges (pre -> target)
    query_edges = "MATCH (pre:Skill)-[:PREREQUISITE_OF]->(s:Skill) RETURN pre.name AS pre_name, s.name AS skill_name"
    try:
        with neo4j_client.driver.session() as session:
            result = session.run(query_edges)
            for record in result:
                pre_name = record["pre_name"]
                skill_name = record["skill_name"]
                if pre_name in G and skill_name in G:
                    G.add_edge(pre_name, skill_name)
    except Exception as e:
        logger.error(f"Error fetching skill edges from Neo4j: {e}")

    # 3. Filter graph to target skills and all their recursive prerequisites (ancestors)
    target_names = [s["name"] for s in skills if s.get("name") in G]
    if not target_names:
        return G

    ancestors = set()
    for target in target_names:
        ancestors.add(target)
        # nx.ancestors returns all nodes that have a path to 'target' (i.e. its prerequisites)
        predecessors = nx.ancestors(G, target)
        ancestors.update(predecessors)

    # Return the induced subgraph of relevant skill nodes
    return G.subgraph(ancestors).copy()

def get_topological_sort(G: nx.DiGraph) -> List[str]:
    """
    Returns a topologically sorted list of skill IDs (names).
    
    Args:
        G (nx.DiGraph): The skill subgraph.
        
    Returns:
        List[str]: Skill IDs in execution order.
    """
    try:
        return list(nx.topological_sort(G))
    except nx.NetworkXUnfeasible:
        logger.error("Unfeasible graph: cycle detected in skill prerequisites!")
        return list(G.nodes)
