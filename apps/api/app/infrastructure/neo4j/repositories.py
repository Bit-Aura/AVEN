from typing import Dict, Optional, List
import logging

logger = logging.getLogger(__name__)

class Neo4jSkillRepository:
    def __init__(self, neo4j_client):
        self.client = neo4j_client

    def get_skill_bkt_params(self, skill_id: str) -> Optional[Dict[str, float]]:
        if not self.client: return None
        try:
            with self.client.driver.session() as session:
                res = session.run(
                    "MATCH (s:Skill {id: $id}) RETURN s.bkt_p_l0 AS p_l0, s.bkt_p_t AS p_t, s.bkt_p_s AS p_s, s.bkt_p_g AS p_g",
                    {"id": skill_id}
                ).single()
                if res and res["p_l0"] is not None:
                    return {
                        "p_l0": float(res["p_l0"]),
                        "p_t": float(res["p_t"]),
                        "p_s": float(res["p_s"]),
                        "p_g": float(res["p_g"])
                    }
        except Exception as e:
            logger.debug(f"Neo4j skill lookup for BKT failed: {e}")
        return None

    def get_all_ancestors(self, skill_id: str) -> List[str]:
        if not self.client: return []
        query = """
        MATCH path = (pre:Skill)-[:PREREQUISITE_OF*1..]->(s:Skill {id: $skill_id})
        RETURN pre.id AS id, pre.name AS name, length(path) AS depth
        ORDER BY depth ASC
        """
        try:
            with self.client.driver.session() as session:
                result = session.run(query, {"skill_id": skill_id})
                return [record["id"] for record in result]
        except Exception as e:
            logger.error(f"Neo4j path matching failed in root-cause backtrace: {e}")
            return []

    def get_direct_parents(self, skill_id: str) -> List[str]:
        if not self.client: return []
        query = """
        MATCH (pre:Skill)-[:PREREQUISITE_OF]->(s:Skill {id: $skill_id})
        RETURN pre.id AS id
        """
        try:
            with self.client.driver.session() as session:
                res = session.run(query, {"skill_id": skill_id})
                return [record["id"] for record in res]
        except Exception as e:
            logger.error(f"Neo4j direct parent lookup failed: {e}")
            return []
