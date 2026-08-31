import logging
import asyncio
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Curated fallback courses for immediate high-fidelity rendering
CURATED_COURSES: Dict[str, List[Dict[str, Any]]] = {
    "api": [
        {
            "title": "REST APIs for Beginners - Full Course",
            "description": "Learn REST API architecture, HTTP methods, status codes, JSON serialization, and best practices for modern web services.",
            "provider": "freeCodeCamp.org",
            "duration": "2h 15m",
            "videoId": "WXsD0ZgxjRw",
            "link": "https://www.youtube.com/watch?v=WXsD0ZgxjRw"
        },
        {
            "title": "FastAPI Tutorial - Build Production Web APIs with Python",
            "description": "Master FastAPI, Pydantic data validation, async route handlers, dependency injection, and automatic OpenAPI docs generation.",
            "provider": "Traversy Media",
            "duration": "1h 45m",
            "videoId": "7t2alSnE2-I",
            "link": "https://www.youtube.com/watch?v=7t2alSnE2-I"
        },
        {
            "title": "API Design & System Architecture Masterclass",
            "description": "Deep dive into RESTful design principles, rate limiting, authentication, payload optimization, and API gateway routing.",
            "provider": "ByteByteGo",
            "duration": "45m",
            "videoId": "Sqb-U-zZ2d8",
            "link": "https://www.youtube.com/watch?v=Sqb-U-zZ2d8"
        },
        {
            "title": "HTTP Protocols, Headers & Sockets Deep Dive",
            "description": "Understand HTTP 1.1 vs HTTP/2, TLS handshake, keep-alive connections, headers, CORS, and request pipelines.",
            "provider": "Hussein Nasser",
            "duration": "1h 10m",
            "videoId": "iYM2zFID4FA",
            "link": "https://www.youtube.com/watch?v=iYM2zFID4FA"
        }
    ],
    "python": [
        {
            "title": "Python for Beginners - Complete Course",
            "description": "Learn Python programming fundamentals, data structures, object-oriented design, modules, and error handling.",
            "provider": "freeCodeCamp.org",
            "duration": "4h 30m",
            "videoId": "rfscVS0vtbw",
            "link": "https://www.youtube.com/watch?v=rfscVS0vtbw"
        },
        {
            "title": "Advanced Python & AsyncIO Concurrency",
            "description": "Master coroutines, event loops, async/await patterns, decorators, generators, and memory management in Python.",
            "provider": "Corey Schafer",
            "duration": "2h 10m",
            "videoId": "BSpb906A8x8",
            "link": "https://www.youtube.com/watch?v=BSpb906A8x8"
        },
        {
            "title": "FastAPI Web Framework Complete Tutorial",
            "description": "Build high-performance asynchronous microservices and RESTful APIs in Python with Pydantic and SQLAlchemy.",
            "provider": "freeCodeCamp.org",
            "duration": "3h 15m",
            "videoId": "0sOvCWFmrtA",
            "link": "https://www.youtube.com/watch?v=0sOvCWFmrtA"
        }
    ],
    "sql": [
        {
            "title": "SQL & Relational Database Design Masterclass",
            "description": "Learn SQL queries, complex joins, indexes, foreign keys, normalization, transactions, and ACID compliance.",
            "provider": "freeCodeCamp.org",
            "duration": "4h 20m",
            "videoId": "HXV3zeQKqGY",
            "link": "https://www.youtube.com/watch?v=HXV3zeQKqGY"
        },
        {
            "title": "PostgreSQL Architecture & Query Optimization",
            "description": "Master PostgreSQL query execution plans, indexing strategies (B-Tree, GIN), partitioning, and connection pooling.",
            "provider": "Hussein Nasser",
            "duration": "1h 50m",
            "videoId": "qw--VYLpxG4",
            "link": "https://www.youtube.com/watch?v=qw--VYLpxG4"
        }
    ],
    "system_design": [
        {
            "title": "System Design Fundamentals for Software Engineers",
            "description": "Learn scalable system architecture: load balancing, caching, database sharding, microservices, and message queues.",
            "provider": "ByteByteGo",
            "duration": "1h 30m",
            "videoId": "m8Icp_Cid5o",
            "link": "https://www.youtube.com/watch?v=m8Icp_Cid5o"
        },
        {
            "title": "Distributed Systems & Scalable Microservices",
            "description": "Explore CAP theorem, distributed consensus, event-driven architecture, gRPC, and high availability design.",
            "provider": "Gaurav Sen",
            "duration": "2h 00m",
            "videoId": "Sqb-U-zZ2d8",
            "link": "https://www.youtube.com/watch?v=Sqb-U-zZ2d8"
        }
    ]
}

def _get_fallback_courses(target_role: str, active_milestone: Optional[str] = None) -> List[Dict[str, Any]]:
    text = f"{target_role} {active_milestone or ''}".lower()
    
    if any(k in text for k in ["api", "rest", "http", "route", "fastapi", "endpoint"]):
        return CURATED_COURSES["api"] + CURATED_COURSES["python"][:1]
    elif any(k in text for k in ["sql", "db", "database", "postgres", "relational"]):
        return CURATED_COURSES["sql"] + CURATED_COURSES["api"][:1]
    elif any(k in text for k in ["system", "design", "scale", "microservice", "architecture"]):
        return CURATED_COURSES["system_design"] + CURATED_COURSES["api"][:1]
    else:
        return CURATED_COURSES["python"] + CURATED_COURSES["api"][:1]

async def fetch_dynamic_courses(target_role: str, active_milestone: Optional[str] = None, limit: int = 6) -> List[Dict[str, Any]]:
    # Attempt live search via youtubesearchpython if installed with 5.0s timeout limit
    try:
        from youtubesearchpython import VideosSearch
        
        query = f"{target_role} {active_milestone} tutorial full course" if active_milestone else f"{target_role} full course tutorial masterclass"
        logger.info(f"Fetching YouTube courses for query: {query}")
        
        def search():
            videos_search = VideosSearch(query, limit=limit)
            return videos_search.result()

        try:
            results = await asyncio.wait_for(asyncio.to_thread(search), timeout=5.0)
        except asyncio.TimeoutError:
            logger.warning(f"YouTube search timed out for query: {query}. Falling back to curated courses catalog.")
            return _get_fallback_courses(target_role, active_milestone)[:limit]

        courses = []
        if results and "result" in results:
            for video in results["result"]:
                desc_snippet = video.get("descriptionSnippet", [])
                description = "".join(part.get("text", "") for part in desc_snippet) if desc_snippet else "Comprehensive guide and course material."
                
                courses.append({
                    "title": video.get("title", "Unknown Course"),
                    "description": description[:120] + "..." if len(description) > 120 else description,
                    "provider": video.get("channel", {}).get("name", "YouTube Creator"),
                    "duration": video.get("duration", "N/A"),
                    "videoId": video.get("id"),
                    "link": video.get("link")
                })
        if courses:
            return courses
    except Exception as e:
        logger.warning(f"Live YouTube search unavailable/failed ({e}). Falling back to curated courses catalog.")

    # Return curated fallbacks matching current milestone & role
    return _get_fallback_courses(target_role, active_milestone)[:limit]
