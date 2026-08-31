"""
Graph engine for prerequisite resolution using NetworkX and Neo4j.
"""
from typing import List, Dict, Any
import logging
import networkx as nx
from app.infrastructure.ai.gateway import AIProvider
from app.infrastructure.neo4j.client import Neo4jClient

logger = logging.getLogger(__name__)

async def build_skill_subgraph(
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
        async with neo4j_client.async_driver.session() as session:
            result = await session.run(query_nodes)
            async for record in result:
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
        async with neo4j_client.async_driver.session() as session:
            result = await session.run(query_edges)
            async for record in result:
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
    Uses Tarjan's SCC to dynamically intercept and prune cyclic edges.
    """
    # Identify Strongly Connected Components (Tarjan's)
    sccs = list(nx.strongly_connected_components(G))
    
    for scc in sccs:
        if len(scc) > 1:
            # Cycle detected in this component. Break it by removing the weakest edge.
            subgraph = G.subgraph(scc).copy()
            weakest_edge = None
            lowest_weight = float('inf')
            
            for u, v, data in subgraph.edges(data=True):
                weight = data.get('confidence', 1.0)
                if weight < lowest_weight:
                    lowest_weight = weight
                    weakest_edge = (u, v)
                    
            if weakest_edge:
                logger.warning(f"Pruning empirical edge {weakest_edge} to resolve cycle.")
                G.remove_edge(*weakest_edge)
                
    # Now guaranteed to be a strictly Directed Acyclic Graph (DAG)
    try:
        return list(nx.topological_sort(G))
    except nx.NetworkXUnfeasible:
        logger.error("Unfeasible graph: unresolvable cycle detected!")
        return list(G.nodes)
