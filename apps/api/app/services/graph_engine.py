"""
Graph engine for prerequisite resolution using NetworkX.
"""
from typing import List
from app.models import Skill
import networkx as nx

def build_skill_subgraph(skills: List[Skill]) -> nx.DiGraph:
    """
    Builds a directed graph of skills and their prerequisites.
    
    Args:
        skills (List[Skill]): List of skills to include in the graph.
        
    Returns:
        nx.DiGraph: Directed graph representing prerequisite paths.
    """
    G = nx.DiGraph()
    # TODO: Populate graph nodes and edges from skill prerequisites
    return G

def get_topological_sort(G: nx.DiGraph) -> List[int]:
    """
    Returns a topologically sorted list of skill IDs.
    
    Args:
        G (nx.DiGraph): The skill subgraph.
        
    Returns:
        List[int]: Skill IDs in execution order.
    """
    # TODO: Run networkx.topological_sort(G)
    return []
