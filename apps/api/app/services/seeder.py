import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import Resource, ResourceMetadata, AssessmentItem, SkillRecord
from app.infrastructure.neo4j.client import Neo4jClient
from app.services.semantic_mapper import get_embedding_model

logger = logging.getLogger(__name__)

# 15 Curated Skills for Backend Software Engineer with custom BKT parameters
SKILLS_SEED = [
    {
        "id": "python_basics",
        "name": "Python Basics",
        "description": "Syntax, variable assignments, loops, control structures, and basic functions in Python.",
        "prereqs": [],
        "bkt": {"p_l0": 0.25, "p_t": 0.30, "p_s": 0.08, "p_g": 0.25}
    },
    {
        "id": "python_advanced",
        "name": "Advanced Python",
        "description": "Decorators, generators, context managers, dunder methods, and OOP principles.",
        "prereqs": ["python_basics"],
        "bkt": {"p_l0": 0.12, "p_t": 0.20, "p_s": 0.12, "p_g": 0.18}
    },
    {
        "id": "sql_basics",
        "name": "SQL Basics",
        "description": "Basic database queries including SELECT, WHERE, GROUP BY, and simple filtering.",
        "prereqs": ["python_basics"],
        "bkt": {"p_l0": 0.22, "p_t": 0.28, "p_s": 0.09, "p_g": 0.22}
    },
    {
        "id": "db_design",
        "name": "SQL Database Design & Joins",
        "description": "Database normalization, indexes, primary/foreign keys, and multi-table JOIN operations.",
        "prereqs": ["sql_basics"],
        "bkt": {"p_l0": 0.14, "p_t": 0.22, "p_s": 0.11, "p_g": 0.16}
    },
    {
        "id": "http_fundamentals",
        "name": "HTTP Fundamentals",
        "description": "Understanding HTTP methods, status codes, headers, and request/response life cycles.",
        "prereqs": ["python_basics"],
        "bkt": {"p_l0": 0.20, "p_t": 0.25, "p_s": 0.10, "p_g": 0.20}
    },
    {
        "id": "api_design",
        "name": "REST API Design",
        "description": "Designing clean, resource-oriented endpoint structures, serialization, and versioning.",
        "prereqs": ["http_fundamentals"],
        "bkt": {"p_l0": 0.15, "p_t": 0.22, "p_s": 0.10, "p_g": 0.18}
    },
    {
        "id": "fastapi_basics",
        "name": "FastAPI Basics",
        "description": "Declaring endpoints, path/query params, using Pydantic, and dependency injection.",
        "prereqs": ["api_design", "python_advanced"],
        "bkt": {"p_l0": 0.15, "p_t": 0.25, "p_s": 0.10, "p_g": 0.20}
    },
    {
        "id": "orm_sqlalchemy",
        "name": "SQLAlchemy ORM",
        "description": "Connecting Python to relational databases using models, async sessions, and migrations.",
        "prereqs": ["python_advanced", "db_design"],
        "bkt": {"p_l0": 0.10, "p_t": 0.18, "p_s": 0.14, "p_g": 0.15}
    },
    {
        "id": "auth_jwt",
        "name": "Authentication & JWT",
        "description": "Securing web endpoints using JWT tokens, passwords hashing, and roles validation.",
        "prereqs": ["fastapi_basics"],
        "bkt": {"p_l0": 0.12, "p_t": 0.20, "p_s": 0.12, "p_g": 0.16}
    },
    {
        "id": "testing_pytest",
        "name": "Testing with Pytest",
        "description": "Writing unit tests, setting up mock fixtures, and testing async endpoints.",
        "prereqs": ["fastapi_basics"],
        "bkt": {"p_l0": 0.16, "p_t": 0.24, "p_s": 0.10, "p_g": 0.18}
    },
    {
        "id": "docker_basics",
        "name": "Docker Basics",
        "description": "Creating Dockerfiles, understanding images, container isolation, and caching layers.",
        "prereqs": ["http_fundamentals"],
        "bkt": {"p_l0": 0.18, "p_t": 0.25, "p_s": 0.10, "p_g": 0.20}
    },
    {
        "id": "docker_compose",
        "name": "Docker Compose",
        "description": "Orchestrating multi-container environments, setting up networks, volumes, and links.",
        "prereqs": ["docker_basics"],
        "bkt": {"p_l0": 0.14, "p_t": 0.22, "p_s": 0.11, "p_g": 0.18}
    },
    {
        "id": "caching_redis",
        "name": "Caching with Redis",
        "description": "Key-value cache storage, cache eviction policies, and session storage.",
        "prereqs": ["fastapi_basics"],
        "bkt": {"p_l0": 0.12, "p_t": 0.20, "p_s": 0.12, "p_g": 0.15}
    },
    {
        "id": "message_queues",
        "name": "Asynchronous Queues & Celery",
        "description": "Running long tasks asynchronously using workers, brokers (Redis/RabbitMQ).",
        "prereqs": ["caching_redis"],
        "bkt": {"p_l0": 0.10, "p_t": 0.18, "p_s": 0.13, "p_g": 0.14}
    },
    {
        "id": "system_design",
        "name": "System Design & Scale",
        "description": "Load balancers, scale-out strategies, horizontal partition (sharding), and database read replicas.",
        "prereqs": ["docker_compose", "message_queues"],
        "bkt": {"p_l0": 0.08, "p_t": 0.15, "p_s": 0.15, "p_g": 0.12}
    }
]

# Resources with diverse modalities, durations, costs, and difficulty depths
RESOURCES_SEED = [
    {
        "title": "Python for Beginners (Video Crash Course)",
        "content": "A fast paced introduction to variables, data types, loops, lists, and functions in Python.",
        "url": "https://example.com/python-video",
        "skill_id": "python_basics",
        "metadata": {"modality": "video", "duration_minutes": "45", "cost": "free", "depth": "0.3"}
    },
    {
        "title": "Interactive Python Exercise Manual (Project-based)",
        "content": "Code sandbox projects to build CLI calculators, text-based games, and parsing utilities.",
        "url": "https://example.com/python-project",
        "skill_id": "python_basics",
        "metadata": {"modality": "project", "duration_minutes": "120", "cost": "paid", "depth": "0.7"}
    },
    {
        "title": "Decorators, Context Managers, and Generators Guide",
        "content": "Deep dive text article with copy-pasteable code examples for advanced control flows in Python.",
        "url": "https://example.com/python-adv-text",
        "skill_id": "python_advanced",
        "metadata": {"modality": "text", "duration_minutes": "30", "cost": "free", "depth": "0.8"}
    },
    {
        "title": "Hands-On Advanced Object Oriented Python",
        "content": "Build custom classes, abstract models, and metaclasses. A project based training.",
        "url": "https://example.com/python-adv-project",
        "skill_id": "python_advanced",
        "metadata": {"modality": "project", "duration_minutes": "180", "cost": "paid", "depth": "0.9"}
    },
    {
        "title": "Learn SQL Queries in 30 Minutes",
        "content": "Video demonstrating SELECT, WHERE filters, GROUP BY, and aggregation functions on databases.",
        "url": "https://example.com/sql-basics-video",
        "skill_id": "sql_basics",
        "metadata": {"modality": "video", "duration_minutes": "30", "cost": "free", "depth": "0.3"}
    },
    {
        "title": "Visual Guide to SQL Joins",
        "content": "Interactive text comparing INNER JOIN, LEFT JOIN, RIGHT JOIN, and database normalization patterns.",
        "url": "https://example.com/sql-joins-text",
        "skill_id": "db_design",
        "metadata": {"modality": "text", "duration_minutes": "25", "cost": "free", "depth": "0.6"}
    },
    {
        "title": "HTTP Protocol Demystified",
        "content": "Text explaining TCP connections, HTTP verbs, response codes, statelessness, and headers.",
        "url": "https://example.com/http-text",
        "skill_id": "http_fundamentals",
        "metadata": {"modality": "text", "duration_minutes": "20", "cost": "free", "depth": "0.4"}
    },
    {
        "title": "REST API Architecture & Design Guidelines",
        "content": "Best practices for URL structuring, HTTP methods mapping, JSON serialization, and version headers.",
        "url": "https://example.com/rest-text",
        "skill_id": "api_design",
        "metadata": {"modality": "text", "duration_minutes": "40", "cost": "free", "depth": "0.6"}
    },
    {
        "title": "FastAPI Masterclass: Build a Real-Time App",
        "content": "A video course building an API server using Pydantic, dependency injection, and automatic OpenAPI.",
        "url": "https://example.com/fastapi-video",
        "skill_id": "fastapi_basics",
        "metadata": {"modality": "video", "duration_minutes": "150", "cost": "paid", "depth": "0.8"}
    },
    {
        "title": "Async Databases with SQLAlchemy 2.0",
        "content": "Detailed project tutorial mapping tables, creating relationships, and running async transactions.",
        "url": "https://example.com/sqlalchemy-project",
        "skill_id": "orm_sqlalchemy",
        "metadata": {"modality": "project", "duration_minutes": "90", "cost": "free", "depth": "0.75"}
    },
    {
        "title": "JWT Auth & API Security Implementation",
        "content": "Video walkthrough on hashing user passwords with bcrypt and creating/verifying JSON Web Tokens.",
        "url": "https://example.com/auth-jwt-video",
        "skill_id": "auth_jwt",
        "metadata": {"modality": "video", "duration_minutes": "60", "cost": "free", "depth": "0.7"}
    },
    {
        "title": "Writing Pytest Unit Tests for APIs",
        "content": "Project guide creating test clients, setting up database fixtures, and asserting mock HTTP responses.",
        "url": "https://example.com/testing-pytest-project",
        "skill_id": "testing_pytest",
        "metadata": {"modality": "project", "duration_minutes": "80", "cost": "free", "depth": "0.65"}
    },
    {
        "title": "Docker Crash Course: From Container to Compose",
        "content": "Video course creating images with Dockerfiles and setting up multi-container database networking.",
        "url": "https://example.com/docker-compose-video",
        "skill_id": "docker_compose",
        "metadata": {"modality": "video", "duration_minutes": "110", "cost": "paid", "depth": "0.8"}
    },
    {
        "title": "Redis Caching in Python & FastAPI",
        "content": "Text explaining key-value cache lookups, cache eviction policies, and cache invalidation.",
        "url": "https://example.com/redis-text",
        "skill_id": "caching_redis",
        "metadata": {"modality": "text", "duration_minutes": "35", "cost": "free", "depth": "0.7"}
    },
    {
        "title": "Celery & Redis: Building Background Workers",
        "content": "Project based tutorial queuing heavy emails and PDF processing workflows outside web threads.",
        "url": "https://example.com/celery-project",
        "skill_id": "message_queues",
        "metadata": {"modality": "project", "duration_minutes": "100", "cost": "free", "depth": "0.85"}
    },
    {
        "title": "System Design: Scaling to 1 Million Users",
        "content": "Text blueprint detailing load balancer strategies, horizontal partitions, and caching patterns.",
        "url": "https://example.com/system-design-text",
        "skill_id": "system_design",
        "metadata": {"modality": "text", "duration_minutes": "90", "cost": "free", "depth": "0.95"}
    }
]

# Assessment Items for each Skill (Prove-It / Diagnostic Questions)
ASSESSMENTS_SEED = [
    {
        "title": "Python Loop Execution",
        "content": '{"question": "What is the output of [x*2 for x in range(3)] in Python?", "options": ["[0, 2, 4]", "[0, 1, 2]", "[2, 4, 6]"], "correct_answer": "[0, 2, 4]", "target_skill": "python_basics"}',
        "difficulty": "beginner"
    },
    {
        "title": "Advanced Python Decorators",
        "content": '{"question": "Which decorator attribute preserves the original functions metadata?", "options": ["@functools.wraps", "@functools.preserve", "@decorator.keep"], "correct_answer": "@functools.wraps", "target_skill": "python_advanced"}',
        "difficulty": "advanced"
    },
    {
        "title": "SQL Basic Filters",
        "content": '{"question": "Which SQL clause is used to filter group results after grouping?", "options": ["HAVING", "WHERE", "FILTER"], "correct_answer": "HAVING", "target_skill": "sql_basics"}',
        "difficulty": "beginner"
    },
    {
        "title": "SQL Database Joins",
        "content": '{"question": "Which JOIN returns all records from the left table and matched records from the right?", "options": ["LEFT JOIN", "INNER JOIN", "FULL JOIN"], "correct_answer": "LEFT JOIN", "target_skill": "db_design"}',
        "difficulty": "intermediate"
    },
    {
        "title": "HTTP Methods",
        "content": '{"question": "Which HTTP method should be used to partially update an existing resource?", "options": ["PATCH", "PUT", "POST"], "correct_answer": "PATCH", "target_skill": "http_fundamentals"}',
        "difficulty": "beginner"
    },
    {
        "title": "REST API Versioning",
        "content": '{"question": "What is the most standard, self-documenting way to version a REST API?", "options": ["URL path versioning (e.g. /v1/users)", "Query parameters", "Custom response header"], "correct_answer": "URL path versioning (e.g. /v1/users)", "target_skill": "api_design"}',
        "difficulty": "intermediate"
    },
    {
        "title": "FastAPI Dependency Injection",
        "content": '{"question": "What function does FastAPI use to declare endpoint dependencies?", "options": ["Depends", "Dependency", "Inject"], "correct_answer": "Depends", "target_skill": "fastapi_basics"}',
        "difficulty": "intermediate"
    },
    {
        "title": "SQLAlchemy Async Operations",
        "content": '{"question": "Which method is used in SQLAlchemy to load related items in a single query?", "options": ["selectinload", "lazyload", "joinload"], "correct_answer": "selectinload", "target_skill": "orm_sqlalchemy"}',
        "difficulty": "advanced"
    },
    {
        "title": "Auth Tokens Validation",
        "content": '{"question": "What are the three parts of a JSON Web Token (JWT)?", "options": ["Header, Payload, Signature", "Username, Password, Salt", "Token, Expiration, Key"], "correct_answer": "Header, Payload, Signature", "target_skill": "auth_jwt"}',
        "difficulty": "intermediate"
    },
    {
        "title": "Testing Mocks",
        "content": '{"question": "In pytest, how do you inject mock instances into a test function?", "options": ["Using fixtures", "Importing Mock", "Passing monkeypatch"], "correct_answer": "Using fixtures", "target_skill": "testing_pytest"}',
        "difficulty": "intermediate"
    },
    {
        "title": "Docker Layers Caching",
        "content": '{"question": "Which instruction in a Dockerfile invalidates downstream caching if files change?", "options": ["COPY", "ENV", "RUN"], "correct_answer": "COPY", "target_skill": "docker_basics"}',
        "difficulty": "intermediate"
    },
    {
        "title": "Docker Compose Networking",
        "content": '{"question": "How do containers in the same docker-compose file communicate by default?", "options": ["Via their service name as hostnames", "Via localhost", "Via container IDs"], "correct_answer": "Via their service name as hostnames", "target_skill": "docker_compose"}',
        "difficulty": "intermediate"
    },
    {
        "title": "Redis Eviction",
        "content": '{"question": "Which eviction policy deletes the least recently used keys in Redis?", "options": ["allkeys-lru", "allkeys-random", "noeviction"], "correct_answer": "allkeys-lru", "target_skill": "caching_redis"}',
        "difficulty": "advanced"
    },
    {
        "title": "Message Queues Broker",
        "content": '{"question": "What is Celery\'s primary requirement for distributing async task messages?", "options": ["A message broker (e.g. Redis/RabbitMQ)", "A database connection", "A multithreaded processor"], "correct_answer": "A message broker (e.g. Redis/RabbitMQ)", "target_skill": "message_queues"}',
        "difficulty": "advanced"
    },
    {
        "title": "System Design Scaling",
        "content": '{"question": "Which mechanism distributes traffic across multiple backend servers?", "options": ["Load Balancer", "Reverse Proxy", "Read Replica"], "correct_answer": "Load Balancer", "target_skill": "system_design"}',
        "difficulty": "advanced"
    }
]

async def seed_all(db: AsyncSession, neo4j_client: Neo4jClient):
    """
    Seeds Neo4j and PostgreSQL databases with default skills, resources, and assessments.
    """
    logger.info("Starting Neo4j skill graph seeding...")
    model = get_embedding_model()
    
    # 1. Seed Neo4j Skills and Prerequisites
    with neo4j_client.driver.session() as session:
        # Create unique constraint (id & name)
        session.run("CREATE CONSTRAINT skill_id_unique IF NOT EXISTS FOR (s:Skill) REQUIRE s.id IS UNIQUE")
        session.run("CREATE CONSTRAINT skill_name_unique IF NOT EXISTS FOR (s:Skill) REQUIRE s.name IS UNIQUE")
        
        # Merge skill nodes with BKT weights
        for skill in SKILLS_SEED:
            bkt = skill.get("bkt", {"p_l0": 0.15, "p_t": 0.20, "p_s": 0.10, "p_g": 0.20})
            session.run(
                """
                MERGE (s:Skill {id: $id})
                SET s.name = $name,
                    s.description = $description,
                    s.bkt_p_l0 = $p_l0,
                    s.bkt_p_t = $p_t,
                    s.bkt_p_s = $p_s,
                    s.bkt_p_g = $p_g
                """,
                {
                    "id": skill["id"],
                    "name": skill["name"],
                    "description": skill["description"],
                    "p_l0": bkt["p_l0"],
                    "p_t": bkt["p_t"],
                    "p_s": bkt["p_s"],
                    "p_g": bkt["p_g"]
                }
            )
            
        # Merge prerequisite relationships
        for skill in SKILLS_SEED:
            for prereq_id in skill["prereqs"]:
                session.run(
                    """
                    MATCH (pre:Skill {id: $pre_id})
                    MATCH (s:Skill {id: $id})
                    MERGE (pre)-[:PREREQUISITE_OF]->(s)
                    """,
                    {"pre_id": prereq_id, "id": skill["id"]}
                )
    logger.info("Neo4j skill graph seeding completed successfully.")

    # 2. Seed PostgreSQL Skills Table with Vector Embeddings and BKT Factors
    logger.info("Starting PostgreSQL skills table seeding...")
    for skill_data in SKILLS_SEED:
        stmt = select(SkillRecord).where(SkillRecord.id == skill_data["id"])
        existing_skill = (await db.execute(stmt)).scalars().first()
        
        skill_text = f"{skill_data['name']}: {skill_data['description']}"
        emb = model.encode(skill_text, convert_to_numpy=True).tolist()
        bkt = skill_data.get("bkt", {"p_l0": 0.15, "p_t": 0.20, "p_s": 0.10, "p_g": 0.20})
        
        if existing_skill:
            existing_skill.name = skill_data["name"]
            existing_skill.description = skill_data["description"]
            existing_skill.bkt_p_l0 = bkt["p_l0"]
            existing_skill.bkt_p_t = bkt["p_t"]
            existing_skill.bkt_p_s = bkt["p_s"]
            existing_skill.bkt_p_g = bkt["p_g"]
            existing_skill.embedding = emb
        else:
            skill_record = SkillRecord(
                id=skill_data["id"],
                name=skill_data["name"],
                description=skill_data["description"],
                bkt_p_l0=bkt["p_l0"],
                bkt_p_t=bkt["p_t"],
                bkt_p_s=bkt["p_s"],
                bkt_p_g=bkt["p_g"],
                embedding=emb
            )
            db.add(skill_record)

    # 3. Seed PostgreSQL Resources and Metadata
    logger.info("Starting PostgreSQL resources seeding...")
    for res_data in RESOURCES_SEED:
        stmt = select(Resource).where(Resource.title == res_data["title"])
        existing = (await db.execute(stmt)).scalars().first()
        if existing:
            continue
            
        modality = res_data.get("metadata", {}).get("modality", "tutorial")
        resource_type_map = {"video": "video", "project": "project", "text": "article"}
        res_type = resource_type_map.get(modality, "tutorial")
        
        resource = Resource(
            title=res_data["title"],
            content=res_data["content"],
            url=res_data["url"],
            resource_type=res_type,
            skill_id=res_data["skill_id"],
            status="APPROVED",
            embedding=emb
        )
        db.add(resource)
        await db.flush()
        
        meta_items = [
            ResourceMetadata(resource_id=resource.id, key="skill_id", value=res_data["skill_id"]),
        ]
        for k, v in res_data["metadata"].items():
            meta_items.append(ResourceMetadata(resource_id=resource.id, key=k, value=v))
            
        db.add_all(meta_items)
        
    # 4. Seed PostgreSQL Assessment Items
    logger.info("Starting PostgreSQL assessment items seeding...")
    for assess_data in ASSESSMENTS_SEED:
        stmt = select(AssessmentItem).where(AssessmentItem.title == assess_data["title"])
        existing = (await db.execute(stmt)).scalars().first()
        if existing:
            continue
            
        emb = model.encode(assess_data["title"], convert_to_numpy=True).tolist()
        item = AssessmentItem(
            title=assess_data["title"],
            content=assess_data["content"],
            difficulty=assess_data["difficulty"],
            embedding=emb
        )
        db.add(item)
        
    await db.commit()

    # 5. Ingest Canonical Skill Topology from roadmap.sh
    logger.info("Starting canonical roadmap.sh topology ingestion...")
    try:
        from app.services.roadmap_ingestion import roadmap_ingestion_service
        await roadmap_ingestion_service.sync_roadmap_slug("backend", db, force=False)
    except Exception as e:
        logger.warning(f"roadmap.sh topology sync in seeder encountered error: {e}")

    logger.info("PostgreSQL seeding completed successfully.")

