import logging
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.core.config import settings

logger = logging.getLogger(__name__)

# Fallback in-memory fixture datasets for offline execution & testing
FIXTURE_ROADMAPS = [
    {"slug": "backend", "title": "Backend Developer", "updatedAt": "2026-08-01T00:00:00Z"},
    {"slug": "python", "title": "Python Developer", "updatedAt": "2026-08-01T00:00:00Z"},
    {"slug": "sql", "title": "SQL & Relational Databases", "updatedAt": "2026-08-01T00:00:00Z"},
    {"slug": "system-design", "title": "System Design", "updatedAt": "2026-08-01T00:00:00Z"},
    {"slug": "frontend", "title": "Frontend Developer", "updatedAt": "2026-08-01T00:00:00Z"},
    {"slug": "javascript", "title": "JavaScript", "updatedAt": "2026-08-01T00:00:00Z"},
    {"slug": "react", "title": "React", "updatedAt": "2026-08-01T00:00:00Z"},
    {"slug": "devops", "title": "DevOps Roadmap", "updatedAt": "2026-08-01T00:00:00Z"},
    {"slug": "docker", "title": "Docker Roadmap", "updatedAt": "2026-08-01T00:00:00Z"},
    {"slug": "kubernetes", "title": "Kubernetes Roadmap", "updatedAt": "2026-08-01T00:00:00Z"},
    {"slug": "mlops", "title": "MLOps Engineer", "updatedAt": "2026-08-01T00:00:00Z"},
    {"slug": "ai-engineer", "title": "AI Engineer", "updatedAt": "2026-08-01T00:00:00Z"},
    {"slug": "data-engineer", "title": "Data Engineer", "updatedAt": "2026-08-01T00:00:00Z"},
]

FIXTURE_CLEAN_NODES: Dict[str, List[Dict[str, Any]]] = {
    "backend": [
        {
            "id": "backend_internet",
            "label": "Internet & HTTP Basics",
            "type": "topic",
            "depth": 1,
            "children": [
                {
                    "id": "backend_http",
                    "label": "HTTP Methods & REST API",
                    "type": "subtopic",
                    "depth": 2,
                    "resources": [
                        {"title": "MDN HTTP Overview", "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview", "type": "article"},
                        {"title": "RESTful API Crash Course", "url": "https://www.youtube.com/watch?v=lsMQRaeHwkY", "type": "video"}
                    ]
                }
            ]
        },
        {
            "id": "backend_python_basics",
            "label": "Python Programming",
            "type": "topic",
            "depth": 1,
            "children": [
                {
                    "id": "backend_fastapi",
                    "label": "FastAPI & Modern Web Frameworks",
                    "type": "subtopic",
                    "depth": 2,
                    "resources": [
                        {"title": "FastAPI Official Documentation", "url": "https://fastapi.tiangolo.com/", "type": "documentation"}
                    ]
                }
            ]
        },
        {
            "id": "backend_relational_db",
            "label": "Relational Databases",
            "type": "topic",
            "depth": 1,
            "children": [
                {
                    "id": "backend_sql_design",
                    "label": "SQL Schema & Normalization",
                    "type": "subtopic",
                    "depth": 2,
                    "resources": [
                        {"title": "Database Design Guide", "url": "https://roadmap.sh/guides/sql-db-design", "type": "article"}
                    ]
                }
            ]
        }
    ],
    "python": [
        {
            "id": "py_basics",
            "label": "Python Syntax & Data Structures",
            "type": "topic",
            "depth": 1,
            "children": [
                {
                    "id": "py_advanced",
                    "label": "Decorators & Generators",
                    "type": "subtopic",
                    "depth": 2,
                    "resources": [
                        {"title": "Real Python Decorators", "url": "https://realpython.com/primer-on-python-decorators/", "type": "article"}
                    ]
                }
            ]
        }
    ],
    "sql": [
        {
            "id": "sql_core",
            "label": "SQL Fundamentals",
            "type": "topic",
            "depth": 1,
            "children": [
                {
                    "id": "sql_indexing",
                    "label": "Indexing & Query Optimization",
                    "type": "subtopic",
                    "depth": 2,
                    "resources": [
                        {"title": "Use The Index, Luke!", "url": "https://use-the-index-luke.com/", "type": "article"}
                    ]
                }
            ]
        }
    ],
    "system-design": [
        {
            "id": "sys_architecture",
            "label": "Distributed Systems Principles",
            "type": "topic",
            "depth": 1,
            "children": [
                {
                    "id": "sys_caching",
                    "label": "Caching Strategies & Redis",
                    "type": "subtopic",
                    "depth": 2,
                    "resources": [
                        {"title": "System Design Primer - Caching", "url": "https://github.com/donnemartin/system-design-primer#caching", "type": "article"}
                    ]
                }
            ]
        }
    ]
}

FIXTURE_EDGES: Dict[str, List[Dict[str, str]]] = {
    "backend": [
        {"source": "backend_internet", "target": "backend_http"},
        {"source": "backend_http", "target": "backend_python_basics"},
        {"source": "backend_python_basics", "target": "backend_fastapi"},
        {"source": "backend_relational_db", "target": "backend_sql_design"},
        {"source": "backend_sql_design", "target": "backend_fastapi"},
    ],
    "python": [
        {"source": "py_basics", "target": "py_advanced"}
    ],
    "sql": [
        {"source": "sql_core", "target": "sql_indexing"}
    ],
    "system-design": [
        {"source": "sys_architecture", "target": "sys_caching"}
    ]
}

class RoadmapClient:
    """
    Client for consuming live roadmap.sh scraper API via Parse.bot with credit awareness.
    Falls back to embedded fixture roadmaps when upstream API is unreachable or offline.
    """

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        self.base_url = base_url or "https://api.parse.bot/scraper/e532bb5b-2c0c-4c43-a138-11bf4ab04ad5"
        self.api_key = api_key or settings.ROADMAP_SH_API_KEY
        self._http_client = httpx.AsyncClient(timeout=15.0)

    async def close(self):
        await self._http_client.aclose()

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "API-Snapshot-Version": "6",
            "User-Agent": "Aven-CareerPathFinder/1.0",
        }
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        return headers

    async def list_roadmaps(self) -> List[Dict[str, Any]]:
        """
        Lists available roadmaps from live roadmap.sh catalog.
        Cost: 1 credit
        """
        try:
            response = await self._http_client.get(f"{self.base_url}/list_roadmaps", headers=self._get_headers())
            if response.status_code == 200:
                raw_roadmaps = response.json().get("data", {}).get("roadmaps", [])
                if raw_roadmaps:
                    items = []
                    for r in raw_roadmaps:
                        slug = r.get("id") or r.get("url", "").replace("/", "")
                        if slug:
                            items.append({
                                "slug": slug,
                                "title": r.get("title") or r.get("shortTitle") or slug.replace("-", " ").title(),
                                "description": r.get("description", ""),
                                "updatedAt": r.get("updatedAt", datetime.now(timezone.utc).isoformat())
                            })
                    return items
        except Exception as e:
            logger.debug(f"[RoadmapClient] list_roadmaps HTTP request failed ({e}); falling back to fixtures.")
        return FIXTURE_ROADMAPS

    async def get_roadmap_detail(self, slug: str) -> Dict[str, Any]:
        """
        Retrieves raw graph topology (nodes + flowchart edges) for a roadmap slug from roadmap.sh.
        Cost: 1 credit
        """
        try:
            response = await self._http_client.get(
                f"{self.base_url}/get_roadmap_detail",
                params={"slug": slug},
                headers=self._get_headers()
            )
            if response.status_code == 200:
                data = response.json().get("data", {})
                if data and (data.get("nodes") or data.get("edges")):
                    title_obj = data.get("title", {})
                    title_str = title_obj.get("page") if isinstance(title_obj, dict) else str(title_obj or slug)
                    return {
                        "slug": slug,
                        "title": title_str,
                        "description": data.get("description", ""),
                        "updatedAt": data.get("updatedAt", datetime.now(timezone.utc).isoformat()),
                        "nodes": data.get("nodes", []),
                        "edges": data.get("edges", [])
                    }
        except Exception as e:
            logger.debug(f"[RoadmapClient] get_roadmap_detail HTTP request failed for '{slug}' ({e}); falling back to fixtures.")
        
        edges = FIXTURE_EDGES.get(slug, [])
        clean_nodes = FIXTURE_CLEAN_NODES.get(slug, [])
        flat_nodes = []
        for n in clean_nodes:
            flat_nodes.append({"id": n["id"], "label": n["label"], "type": n["type"]})
            for c in n.get("children", []):
                flat_nodes.append({"id": c["id"], "label": c["label"], "type": c["type"]})

        return {
            "slug": slug,
            "title": slug.replace("-", " ").title(),
            "description": f"Curriculum roadmap for {slug}",
            "updatedAt": "2026-08-01T00:00:00Z",
            "nodes": flat_nodes,
            "edges": edges
        }

    async def get_clean_roadmap_nodes(self, slug: str) -> List[Dict[str, Any]]:
        """
        Retrieves hierarchical topics for a roadmap slug.
        Converts live topic mappings from get_roadmap_topics into normalized nodes.
        Cost: 1 credit
        """
        try:
            response = await self._http_client.get(
                f"{self.base_url}/get_roadmap_topics",
                params={"slug": slug},
                headers=self._get_headers()
            )
            if response.status_code == 200:
                data = response.json().get("data", {})
                topics = data.get("topics", [])
                if topics:
                    # Group by main category path (e.g. "Backend > Internet > What is HTTP?")
                    category_groups: Dict[str, Dict[str, Any]] = {}
                    for idx, t in enumerate(topics):
                        raw_text = t.get("text", "")
                        node_id = t.get("nodeId") or f"{slug}_node_{idx}"
                        parts = [p.strip() for p in raw_text.split(">") if p.strip()]
                        
                        if len(parts) >= 3:
                            cat_name = parts[1]
                            topic_title = parts[2]
                        elif len(parts) == 2:
                            cat_name = parts[0]
                            topic_title = parts[1]
                        else:
                            cat_name = parts[0] if parts else slug.title()
                            topic_title = parts[0] if parts else "Overview"

                        if cat_name not in category_groups:
                            category_groups[cat_name] = {
                                "id": f"{slug}_{cat_name.lower().replace(' ', '_').replace('-', '_')}",
                                "label": cat_name,
                                "type": "topic",
                                "depth": 1,
                                "children": []
                            }
                        
                        category_groups[cat_name]["children"].append({
                            "id": node_id,
                            "label": topic_title,
                            "type": "subtopic",
                            "depth": 2,
                            "resources": [
                                {
                                    "title": f"Guide: {topic_title}",
                                    "url": f"https://roadmap.sh/{slug}",
                                    "type": "article"
                                }
                            ]
                        })
                    
                    return list(category_groups.values())
        except Exception as e:
            logger.debug(f"[RoadmapClient] get_clean_roadmap_nodes HTTP request failed for '{slug}' ({e}); falling back to fixtures.")

        return FIXTURE_CLEAN_NODES.get(slug, [
            {
                "id": f"{slug}_core_topic",
                "label": f"{slug.replace('-', ' ').title()} Fundamentals",
                "type": "topic",
                "depth": 1,
                "children": [
                    {
                        "id": f"{slug}_advanced_topic",
                        "label": f"Advanced {slug.replace('-', ' ').title()}",
                        "type": "subtopic",
                        "depth": 2,
                        "resources": [
                            {
                                "title": f"Mastering {slug.replace('-', ' ').title()}",
                                "url": f"https://roadmap.sh/guides/{slug}",
                                "type": "article"
                            }
                        ]
                    }
                ]
            }
        ])

    async def get_topic_detail(self, node_id: str) -> Dict[str, Any]:
        """
        Retrieves markdown description and learning resources for a specific topic node.
        Cost: 1 credit
        """
        try:
            response = await self._http_client.get(
                f"{self.base_url}/get_topic_detail",
                params={"node_id": node_id},
                headers=self._get_headers()
            )
            if response.status_code == 200:
                return response.json().get("data", {})
        except Exception as e:
            logger.debug(f"[RoadmapClient] get_topic_detail failed for '{node_id}' ({e}).")
        return {}

    async def get_roadmap_relations(self, slug: str) -> Dict[str, List[str]]:
        """
        Retrieves related and referenced roadmaps for composite graph validation.
        Cost: 1 credit
        """
        try:
            response = await self._http_client.get(
                f"{self.base_url}/get_roadmap_relations",
                params={"slug": slug},
                headers=self._get_headers()
            )
            if response.status_code == 200:
                return response.json().get("data", {})
        except Exception as e:
            logger.debug(f"[RoadmapClient] get_roadmap_relations HTTP request failed for '{slug}' ({e}).")

        return {
            "relatedRoadmaps": ["python", "sql", "system-design"],
            "referencedRoadmaps": ["devops", "docker"]
        }

roadmap_client = RoadmapClient()
