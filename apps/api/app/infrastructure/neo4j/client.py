import logging
from typing import Any, Dict, List, Optional
from neo4j import GraphDatabase, Driver
from app.core.config import settings

logger = logging.getLogger(__name__)

_MOCK_NODES: Dict[str, Any] = {}
_MOCK_EDGES: List[Dict[str, str]] = []

class MockNeo4jDriver:
    def close(self):
        pass
    class _MockSession:
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def execute_write(self, fn): 
            return fn(self)
        def run(self, query, parameters=None):
            parameters = parameters or {}
            class MockRecord:
                def __init__(self, data):
                    self._data = data
                def __getitem__(self, key):
                    return self._data[key]
                def data(self):
                    return self._data

            if "UNWIND $skills AS s" in query:
                skills = parameters.get("skills", [])
                for s in skills:
                    _MOCK_NODES[s["id"]] = s
                return []
            elif "UNWIND $edges AS e" in query:
                edges = parameters.get("edges", [])
                for e in edges:
                    _MOCK_EDGES.append(e)
                return []
            elif "RETURN s.id" in query:
                if _MOCK_NODES:
                    return [
                        MockRecord({
                            "id": s["id"],
                            "name": s["name"],
                            "description": s.get("description", ""),
                            "bkt_p_l0": s.get("bkt_p_l0", 0.15),
                            "bkt_p_t": s.get("bkt_p_t", 0.20),
                            "bkt_p_s": s.get("bkt_p_s", 0.10),
                            "bkt_p_g": s.get("bkt_p_g", 0.20)
                        })
                        for s in _MOCK_NODES.values()
                    ]
                from app.services.seeder import SKILLS_SEED
                return [
                    MockRecord({
                        "id": s["id"],
                        "name": s["name"],
                        "description": s["description"],
                        "bkt_p_l0": s.get("bkt", {}).get("p_l0", 0.15),
                        "bkt_p_t": s.get("bkt", {}).get("p_t", 0.20),
                        "bkt_p_s": s.get("bkt", {}).get("p_s", 0.10),
                        "bkt_p_g": s.get("bkt", {}).get("p_g", 0.20)
                    })
                    for s in SKILLS_SEED
                ]
            elif "RETURN pre.name" in query:
                if _MOCK_EDGES:
                    id_to_name = {s["id"]: s["name"] for s in _MOCK_NODES.values()}
                    records = []
                    for e in _MOCK_EDGES:
                        pre_id = e.get("pre_id")
                        skill_id = e.get("skill_id")
                        if pre_id in id_to_name and skill_id in id_to_name:
                            records.append(MockRecord({
                                "pre_name": id_to_name[pre_id],
                                "skill_name": id_to_name[skill_id]
                            }))
                    return records
                from app.services.seeder import SKILLS_SEED
                id_to_name = {s["id"]: s["name"] for s in SKILLS_SEED}
                edges = []
                for s in SKILLS_SEED:
                    for prereq_id in s.get("prereqs", []):
                        if prereq_id in id_to_name:
                            edges.append(MockRecord({
                                "pre_name": id_to_name[prereq_id],
                                "skill_name": s["name"]
                            }))
                return edges
            return []
            
    def session(self):
        return self._MockSession()

class Neo4jClient:
    def __init__(self) -> None:
        self._driver: Optional[Any] = None

    def connect(self) -> None:
        if not self._driver:
            try:
                driver = GraphDatabase.driver(
                    settings.NEO4J_URI,
                    auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
                    connection_timeout=2.0
                )
                driver.verify_connectivity()
                self._driver = driver
                logger.info("Successfully connected to Neo4j database.")
            except Exception as e:
                logger.warning(f"Failed to connect to Neo4j database: {e}. Falling back to MockNeo4jDriver.")
                self._driver = MockNeo4jDriver()

    def close(self) -> None:
        if self._driver:
            self._driver.close()
            self._driver = None
            logger.info("Neo4j database connection closed.")

    @property
    def driver(self) -> Any:
        if not self._driver:
            self.connect()
        assert self._driver is not None
        return self._driver

    async def execute_query(
        self, query: str, parameters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes a Cypher query and returns the results.
        """
        driver = self.driver
        # Use sync execution inside an executor or streamlined blocking call since neo4j driver is thread-safe
        # For simplicity in this scaffolding, we run standard session query.
        def _run(tx):
            result = tx.run(query, parameters or {})
            return [record.data() for record in result]

        with driver.session() as session:
            return session.execute_write(_run)

neo4j_client = Neo4jClient()
