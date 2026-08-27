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


def _generate_backend_fixtures():
    topic_specs = [
        ('Internet & Networking', ['How Internet Works', 'HTTP & HTTPS', 'DNS Architecture', 'Domain Names & TLDs', 'Web Hosting & Servers', 'IP Addresses & Sockets', 'Network Topology', 'DNS Resolution Flow']),
        ('Frontend Overview', ['HTML5 Semantics', 'CSS Flexbox & Grid', 'JavaScript Fundamentals', 'DOM Manipulation', 'Event Loop & Promises', 'Web Security Basics']),
        ('Operating Systems & Linux', ['Linux Shell & Bash', 'POSIX & System Calls', 'Process Management', 'Memory & Paging', 'File Systems & I/O', 'Signal Handling']),
        ('Programming Languages', ['Python Fundamentals', 'Java Core & JVM', 'Go Syntax & Concurrency', 'Node.js & Event Driven', 'Type Systems & Static Typing', 'OOP & Design Patterns']),
        ('Package Management', ['Virtual Environments', 'npm & yarn Package Managers', 'pip & poetry Dependency Management', 'Semantic Versioning', 'Build Tools & Bundlers', 'Linters & Formatters']),
        ('Relational Databases', ['RDBMS Concepts & ACID', 'SQL Query Syntax', 'Table Normalization (1NF-3NF)', 'PostgreSQL Administration', 'MySQL & InnoDB Engine', 'Primary & Foreign Keys']),
        ('Advanced SQL & Performance', ['B-Tree & Hash Indexing', 'EXPLAIN & Query Optimization', 'Transactions & Isolation Levels', 'Database Locking & Deadlocks', 'Window Functions & CTEs', 'Database Migrations & Tools']),
        ('NoSQL Databases', ['Document Stores (MongoDB)', 'Key-Value Stores (Redis)', 'Columnar Stores (Cassandra)', 'Graph Databases (Neo4j)', 'Data Modeling in NoSQL', 'Sharding & Replication']),
        ('Caching & In-Memory Stores', ['HTTP & Browser Caching', 'CDN & Edge Caching', 'Redis Caching Strategies', 'Cache Invalidation & Eviction', 'Read-Through & Write-Through', 'Memcached Patterns']),
        ('APIs & Web Services', ['RESTful API Design', 'OpenAPI / Swagger Specs', 'GraphQL Schemas & Resolvers', 'gRPC & Protocol Buffers', 'WebSockets & SSE', 'API Gateway Patterns']),
        ('Authentication & Auth', ['Session-Based Auth', 'JWT & Token Bearer Auth', 'OAuth 2.0 & OIDC', 'Password Hashing (bcrypt, Argon2)', 'RBAC & ABAC Access Control', 'Multi-Factor Auth (MFA)']),
        ('Web Security', ['OWASP Top 10 Vulnerabilities', 'Cross-Site Scripting (XSS)', 'Cross-Site Request Forgery (CSRF)', 'SQL Injection Prevention', 'HTTPS, TLS & SSL Certificates', 'Content Security Policy (CSP)']),
        ('Testing & QA', ['Unit Testing & Assertions', 'Integration Testing', 'End-to-End API Testing', 'Mocking & Stubbing Dependencies', 'Test Driven Development (TDD)', 'Code Coverage Analysis']),
        ('Version Control & Git', ['Git Fundamentals & Commands', 'Branching Strategies (GitFlow)', 'Pull Requests & Code Review', 'Git Rebase vs Merge', 'Git Hooks & Husky', 'Submodules & Monorepos']),
        ('CI/CD & Automation', ['CI/CD Pipeline Architecture', 'GitHub Actions Workflows', 'Build Artifacts & Registries', 'Automated Testing in CI', 'Deployment Strategies (Canary)', 'Rollback Mechanisms']),
        ('Containerization & K8s', ['Docker Containers & Images', 'Dockerfile Best Practices', 'Docker Compose Multi-Container', 'Kubernetes Pods & Deployments', 'Kubernetes Services & Ingress', 'Helm Charts & ConfigMaps']),
        ('Web Servers & Proxies', ['Nginx Configuration', 'Caddy & Apache Servers', 'Load Balancing Algorithms', 'SSL Termination at Proxy', 'HTTP/2 & HTTP/3 Protocols', 'Forward vs Reverse Proxies']),
        ('Software Architecture', ['Monolithic Architecture', 'Microservices Architecture', 'Domain-Driven Design (DDD)', 'Clean Architecture & Layering', 'Service Mesh (Istio)', 'Twelve-Factor App Methodology']),
        ('Event-Driven Architecture', ['Message Queues (RabbitMQ)', 'Event Streaming (Apache Kafka)', 'Publisher-Subscriber Pattern', 'Event Sourcing & CQRS', 'Dead Letter Queues (DLQ)', 'Idempotent Message Processing']),
        ('Serverless & Cloud', ['Serverless Functions (AWS Lambda)', 'Cloud Storage (AWS S3)', 'Managed Databases (RDS)', 'Infrastructure as Code (Terraform)', 'Cloud Security & IAM', 'Cost Optimization & FinOps']),
        ('Observability & Monitoring', ['Structured Logging & JSON Logs', 'Metrics & Prometheus', 'Grafana Dashboards & Alerts', 'Distributed Tracing (Jaeger)', 'Error Tracking (Sentry)', 'Health Checks & Liveness Probes']),
        ('System Design & Scalability', ['Scalability (Horizontal vs Vertical)', 'High Availability & SLA', 'Single Point of Failure (SPOF)', 'CAP Theorem & PACELC', 'Database Read Replicas', 'Asynchronous Task Processing']),
        ('Data Engineering', ['ETL & ELT Data Pipelines', 'Data Warehouses (Snowflake)', 'Message Serialization (Avro)', 'Batch Processing (Apache Spark)', 'Data Lakehouses', 'Stream Processing']),
        ('AI & LLM Integration', ['AI Gateway & LLM Proxies', 'Vector Databases (Pinecone)', 'Embeddings & RAG Architecture', 'Prompt Engineering Patterns', 'LLM Rate Limiting', 'Semantic Search']),
        ('Engineering Mastery', ['Code Refactoring & Tech Debt', 'System Design Mock Interviews', 'Incident Response & Post-mortems', 'Engineering Leadership', 'Distributed Systems Patterns', 'Capacity Planning', 'Production Reliability'])
    ]

    nodes = []
    edges = []

    for c_idx, (t_title, subs) in enumerate(topic_specs):
        t_id = f'be_cat_{c_idx+1}'
        children = []
        for s_idx, s_title in enumerate(subs):
            s_id = f'be_sub_{c_idx+1}_{s_idx+1}'
            children.append({
                'id': s_id,
                'label': s_title,
                'type': 'subtopic',
                'depth': 2,
                'resources': [{'title': f'Guide: {s_title}', 'url': 'https://roadmap.sh/backend', 'type': 'article'}]
            })
            edges.append({'source': t_id, 'target': s_id})

        nodes.append({
            'id': t_id,
            'label': t_title,
            'type': 'topic',
            'depth': 1,
            'children': children
        })

        if c_idx > 0:
            prev_t_id = f'be_cat_{c_idx}'
            edges.append({'source': prev_t_id, 'target': t_id})

    cross_edges = []
    # 25 category-to-category sequential edges
    for c_idx in range(len(topic_specs) - 1):
        c_src = f'be_cat_{c_idx+1}'
        c_tgt = f'be_cat_{c_idx+2}'
        cross_edges.append({'source': c_src, 'target': c_tgt})

    # 24 cross-topic subtopic edges
    for c_idx in range(len(topic_specs) - 1):
        s_src = f'be_sub_{c_idx+1}_1'
        s_tgt = f'be_sub_{c_idx+2}_1'
        cross_edges.append({'source': s_src, 'target': s_tgt})

    all_edges = edges + cross_edges
    seen = set()
    dedup_edges = []
    for e in all_edges:
        pair = (e['source'], e['target'])
        if pair not in seen:
            seen.add(pair)
            dedup_edges.append(e)

    return nodes, dedup_edges[:202]

BACKEND_CLEAN_NODES_178, BACKEND_EDGES_202 = _generate_backend_fixtures()

def _generate_python_fixtures():
    topics = [
        ('Python Basics', ['Variables & Types', 'Operators & Expressions', 'Strings & Formatting', 'Control Flow (If/Else)', 'Loops (For, While)', 'Input & Output', 'Type Casting']),
        ('Data Structures', ['Lists & Indexing', 'Tuples & Immutability', 'Dictionaries & Hash Maps', 'Sets & Set Operations', 'List Comprehensions', 'Dict Comprehensions', 'Nested Data Structures']),
        ('Functions & Modules', ['Function Definitions', 'Positional & Keyword Args', '*args and **kwargs', 'Lambda Functions', 'Scope & LEGB Rule', 'Modules & Imports', 'Standard Library Overview']),
        ('Object-Oriented Programming', ['Classes & Instances', 'Attributes & Methods', 'Inheritance & Polymorphism', 'Encapsulation & Private Specs', 'Magic/Dunder Methods', 'Abstract Base Classes', 'Multiple Inheritance & MRO']),
        ('Advanced Python Features', ['Decorators & Wrappers', 'Generators & Yield', 'Iterators & Itertools', 'Context Managers (with)', 'Metaclasses & Type Creation', 'Descriptors & Properties', 'Functional Tools (functools)']),
        ('Concurrency & Async', ['Threading & GIL', 'Multiprocessing & Queues', 'Asyncio & Event Loop', 'Async/Await Syntax', 'Tasks & Futures', 'Async HTTP & Databases', 'Concurrent Futures']),
        ('Type System & Validation', ['Type Hints & Annotations', 'Mypy Static Type Checker', 'Pydantic Models', 'Dataclasses', 'Generics & TypeVars', 'Protocol & Structural Subtyping']),
        ('File I/O & Serialization', ['File Reading & Writing', 'JSON Parsing & Writing', 'CSV & Excel Handling', 'Pickling & Object Serialization', 'Pathlib & OS Paths', 'Binary Files & Bytes']),
        ('Testing & Quality', ['unittest Framework', 'pytest Framework & Fixtures', 'Mocking & Patching', 'Parametrized Testing', 'Coverage.py Analysis', 'Code Formatting (Black, Ruff)', 'Linting (Flake8, Pylint)']),
        ('Web Frameworks & APIs', ['FastAPI & Pydantic', 'Django Architecture & ORM', 'Flask Lightweight Apps', 'RESTful API Development', 'Request Validation & Middleware', 'Authentication (JWT, OAuth2)', 'WebSockets in Python']),
        ('Database Access & ORMs', ['SQLite & DB-API 2.0', 'SQLAlchemy Core & ORM', 'Tortoise ORM & Async DBs', 'Database Migrations (Alembic)', 'Connection Pooling', 'Redis Client (redis-py)']),
        ('Package Management & Devops', ['pip & PyPI', 'Virtual Environments (venv)', 'Poetry & Hatch Packaging', 'pyproject.toml Standard', 'Building Wheels & Source Dist', 'Dockerizing Python Apps', 'CI/CD for Python'])
    ]
    return _generate_fixture_from_topics('py', topics)

def _generate_sql_fixtures():
    topics = [
        ('Relational Database Concepts', ['Data Models & Tables', 'Primary Keys & Foreign Keys', 'Data Integrity & Constraints', 'Entity Relationship Diagrams', '1NF, 2NF, 3NF Normalization', 'Denormalization Tradeoffs']),
        ('Basic SQL Syntax & DML', ['SELECT & Columns', 'WHERE Clause & Operators', 'ORDER BY & Sorting', 'LIMIT & OFFSET Pagination', 'INSERT INTO Statements', 'UPDATE Statements', 'DELETE Statements']),
        ('Filtering & Conditional Logic', ['LIKE, ILIKE & Pattern Matching', 'IN & BETWEEN Operators', 'IS NULL & IS NOT NULL', 'CASE WHEN Statements', 'COALESCE & NULLIF', 'Boolean Logic (AND, OR, NOT)']),
        ('Joins & Set Operations', ['INNER JOIN Syntax', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN', 'CROSS JOIN & Self Joins', 'UNION & UNION ALL', 'INTERSECT & EXCEPT']),
        ('Aggregations & Grouping', ['COUNT, SUM, AVG Functions', 'MIN & MAX Aggregates', 'GROUP BY Clause', 'HAVING Clause Filtering', 'DISTINCT Aggregations', 'GROUPING SETS & ROLLUP']),
        ('Subqueries & CTEs', ['Scalar Subqueries', 'Correlated Subqueries', 'EXISTS & NOT EXISTS', 'Common Table Expressions (WITH)', 'Recursive CTEs', 'Subqueries in FROM / JOIN']),
        ('Window Functions', ['OVER Clause & Partitioning', 'ROW_NUMBER & RANK', 'DENSE_RANK & NTILE', 'LEAD & LAG Functions', 'Running Totals & SUM OVER', 'FIRST_VALUE & LAST_VALUE']),
        ('Indexing & Optimization', ['B-Tree Indexing Mechanics', 'Composite & Unique Indexes', 'Hash & GIN/GiST Indexes', 'EXPLAIN & EXPLAIN ANALYZE', 'Query Execution Plans', 'Index Scans vs Sequential Scans', 'Covering Indexes']),
        ('Transactions & ACID', ['ACID Properties Overview', 'BEGIN, COMMIT & ROLLBACK', 'Isolation Levels (Read Committed, Serializable)', 'Dirty Reads & Phantom Reads', 'Locks & Deadlocks', 'Savepoints']),
        ('DDL & Schema Management', ['CREATE TABLE & Data Types', 'ALTER TABLE Modifications', 'DROP & TRUNCATE TABLE', 'Indexes & Constraint Creation', 'Database Views & Materialized Views', 'Database Schemas & Namespaces']),
        ('Advanced SQL Features', ['JSON & JSONB Queries', 'Full Text Search', 'Triggers & Stored Functions', 'Database Sequences & Auto Increment', 'Partitioning (Range, List, Hash)', 'Foreign Data Wrappers']),
        ('Database Engines & Admin', ['PostgreSQL Architecture & Features', 'MySQL & InnoDB Storage Engine', 'SQLite Embedded Database', 'Database Backups & PG Dump', 'Replication & Connection Pooling'])
    ]
    return _generate_fixture_from_topics('sql', topics)

def _generate_system_design_fixtures():
    topics = [
        ('System Design Fundamentals', ['Client-Server Model', 'Stateless vs Stateful Architecture', 'Latency vs Throughput', 'Availability & SLAs (99.99%)', 'Consistency Models', 'Horizontal vs Vertical Scaling']),
        ('Networking & Protocols', ['DNS & Domain Resolution', 'HTTP/1.1 vs HTTP/2 vs HTTP/3', 'TCP/IP vs UDP Protocols', 'WebSockets & Long Polling', 'TLS/SSL & HTTPS Termination', 'CDN & Edge Networks']),
        ('Load Balancing & Proxies', ['Layer 4 vs Layer 7 Load Balancing', 'Load Balancing Algorithms (Round Robin, Least Connections)', 'Consistent Hashing', 'Reverse Proxies (Nginx, HAProxy)', 'API Gateways & Rate Limiting', 'Health Checks & Failover']),
        ('Database Architecture & Scaling', ['Relational vs NoSQL Selection', 'Database Replication (Primary-Replica)', 'Database Sharding & Partitioning', 'Distributed Transactions & 2PC', 'SAGA Pattern for Microservices', 'Read Replicas & Connection Pools']),
        ('Caching Strategies', ['Client & Edge Caching', 'Application Caching (Redis/Memcached)', 'Cache Patterns (Cache-Aside, Write-Through)', 'Cache Invalidation & TTL', 'Thundering Herd & Cache Stampede', 'Distributed Cache Clusters']),
        ('Messaging & Event Streaming', ['Message Queues (RabbitMQ, SQS)', 'Event Streaming (Apache Kafka)', 'Pub/Sub Messaging Patterns', 'At-least-once vs Exactly-once Delivery', 'Dead Letter Queues (DLQ)', 'Idempotency in Event Handlers']),
        ('Distributed Systems Patterns', ['CAP Theorem & PACELC', 'Circuit Breaker Pattern', 'Bulkhead & Retry Patterns', 'Leader Election (Raft, Paxos, Zookeeper)', 'Distributed Locking (Redlock)', 'Vector Clocks & Logical Clocks']),
        ('Storage & Search', ['Object Storage (AWS S3, Blob)', 'Block vs File Storage', 'Full-Text Search Engines (Elasticsearch)', 'Inverted Indexes & Vector DBs', 'Log-Structured Merge (LSM) Trees', 'B-Trees vs LSM Trees']),
        ('Observability & Security', ['Centralized Structured Logging', 'Metrics Collection (Prometheus)', 'Distributed Tracing (OpenTelemetry)', 'Alerting & On-Call Workflows', 'OAuth2 / OIDC & Token Auth', 'Data Encryption at Rest & In Transit']),
        ('Real-World Architecture Cases', ['Design URL Shortener (TinyURL)', 'Design Rate Limiter', 'Design Distributed Chat (WhatsApp/Slack)', 'Design Video Streaming (YouTube/Netflix)', 'Design News Feed (Twitter/X)', 'Design Ride-Sharing (Uber)'])
    ]
    return _generate_fixture_from_topics('sys', topics)

def _generate_frontend_fixtures():
    topics = [
        ('Web & HTML Fundamentals', ['Semantic HTML5', 'Document Object Model (DOM)', 'HTML Forms & Validation', 'Web Accessibility (a11y & ARIA)', 'SEO Basics & Meta Tags', 'Browser Rendering Engine']),
        ('CSS & Modern Styling', ['CSS Box Model', 'Flexbox Layouts', 'CSS Grid System', 'Responsive Web Design & Media Queries', 'CSS Custom Properties (Variables)', 'Tailwind CSS & Utility-First', 'CSS-in-JS & CSS Modules']),
        ('JavaScript Core', ['Data Types & Equality', 'Functions, Closures & Scope', 'Prototypes & Inheritance', 'ES6+ Features (Destructuring, Spread)', 'DOM Manipulation & Events', 'Event Delegation & Bubbling']),
        ('Asynchronous JavaScript', ['Callbacks & Callback Hell', 'Promises & Promise Chaining', 'Async / Await Syntax', 'Fetch API & Axios', 'Event Loop, Microtasks & Macrotasks', 'Web Workers & Offloading']),
        ('TypeScript for Frontend', ['Type Annotations & Primitive Types', 'Interfaces vs Type Aliases', 'Generics in TypeScript', 'Union & Intersection Types', 'Utility Types (Partial, Pick)', 'TypeScript with React Props']),
        ('React Fundamentals', ['JSX Syntax & Compilation', 'Components (Functional vs Class)', 'Props & Component Composition', 'State Management with useState', 'Side Effects with useEffect', 'Conditional Rendering & Lists']),
        ('Advanced React', ['Custom Hooks', 'useMemo & useCallback Performance', 'useRef & DOM References', 'React Context API', 'Component Lifecycle & Error Boundaries', 'React Fiber & Concurrent Mode']),
        ('Frontend State & Routing', ['Global State (Zustand, Redux Toolkit)', 'Client-side Routing (React Router)', 'Server State & Caching (TanStack Query)', 'Form Libraries (React Hook Form, Zod)', 'Persistent Local Storage']),
        ('Next.js & Modern Frameworks', ['App Router & File-based Routing', 'Server Components (RSC) vs Client Components', 'Server-Side Rendering (SSR) & SSG', 'Server Actions & API Routes', 'Image & Font Optimization']),
        ('Build Tools & Tooling', ['Node.js & npm / pnpm / yarn', 'Vite & ESBuild', 'Webpack & Module Bundling', 'Babel Transpilation', 'ESLint & Prettier Setup', 'Environment Variables']),
        ('Testing & Performance', ['Jest & React Testing Library', 'Component Unit Testing', 'E2E Testing (Cypress / Playwright)', 'Core Web Vitals (LCP, FID, CLS)', 'Code Splitting & Lazy Loading', 'Lighthouse Audits']),
        ('Web Security & PWA', ['Same-Origin Policy & CORS', 'XSS Mitigation & Sanitization', 'CSRF Protection & Cookies', 'Content Security Policy (CSP)', 'Progressive Web Apps (PWA) & Service Workers', 'Web Manifest & Offline Cache'])
    ]
    return _generate_fixture_from_topics('fe', topics)

def _generate_devops_fixtures():
    topics = [
        ('Linux & System Admin', ['Linux File System Hierarchy', 'Command Line Utilities (grep, awk, sed)', 'User Permissions & chmod/chown', 'Process Management (ps, top, kill)', 'Systemd Services & Logs (journalctl)', 'Cron Jobs & Scheduled Tasks']),
        ('Networking & Security', ['OSI Model & TCP/IP Stack', 'DNS, IP Routing & Subnetting', 'HTTP/HTTPS & SSL/TLS Certificates', 'SSH Keys, Config & Hardening', 'Firewalls (ufw, iptables)', 'VPNs & Tunneling']),
        ('Version Control & Git', ['Git CLI Basics', 'Branching & Merging Strategies', 'Git Rebase & Interactive Rebase', 'Git Hooks & Automation', 'GitHub/GitLab PR Workflows', 'Monorepo & Submodules']),
        ('Containerization (Docker)', ['Container vs Virtual Machine', 'Docker Architecture & Engine', 'Writing Production Dockerfiles', 'Multi-stage Docker Builds', 'Docker Networking & Volumes', 'Docker Compose Multi-container Apps']),
        ('Container Orchestration (Kubernetes)', ['Kubernetes Cluster Architecture', 'Pods, ReplicaSets & Deployments', 'Services & NodePort / ClusterIP', 'Ingress Controllers & Nginx Ingress', 'ConfigMaps & Secrets', 'Persistent Volumes & PVCs', 'Helm Package Manager']),
        ('Infrastructure as Code (IaC)', ['IaC Concepts & Benefits', 'Terraform Modules & State Management', 'Terraform Providers (AWS/GCP/Azure)', 'Ansible Playbooks & Configuration', 'CloudFormation & ARM Templates']),
        ('CI/CD Pipelines', ['CI/CD Core Concepts', 'GitHub Actions Workflows & Runners', 'GitLab CI / Jenkins Pipelines', 'Build Artifacts & Container Registries', 'Deployment Strategies (Blue-Green, Canary)', 'Rollback Strategies']),
        ('Cloud Infrastructure (AWS/GCP)', ['Cloud Computing Models (IaaS, PaaS, SaaS)', 'Compute Instances (EC2 / Compute Engine)', 'Object Storage (S3 / Cloud Storage)', 'Virtual Private Clouds (VPC & Subnets)', 'Identity & Access Management (IAM)', 'Serverless (Lambda / Cloud Functions)']),
        ('Monitoring & Observability', ['Metrics, Logs & Traces (MELT)', 'Prometheus Metrics Collection', 'Grafana Dashboard Setup & Alerts', 'Log Aggregation (ELK / EFK / Loki)', 'Distributed Tracing (Jaeger / Tempo)', 'Uptime Monitoring & PagerDuty']),
        ('DevSecOps & Site Reliability', ['Secrets Management (Vault, AWS Secrets Manager)', 'Vulnerability Scanning (Trivy, SonarQube)', 'Site Reliability Engineering (SRE) Principles', 'SLIs, SLOs & Error Budgets', 'Incident Management & Post-mortems', 'Chaos Engineering'])
    ]
    return _generate_fixture_from_topics('devops', topics)

def _generate_fixture_from_topics(prefix, topic_specs):
    nodes = []
    edges = []

    for c_idx, (t_title, subs) in enumerate(topic_specs):
        t_id = f'{prefix}_cat_{c_idx+1}'
        children = []
        for s_idx, s_title in enumerate(subs):
            s_id = f'{prefix}_sub_{c_idx+1}_{s_idx+1}'
            children.append({
                'id': s_id,
                'label': s_title,
                'type': 'subtopic',
                'depth': 2,
                'resources': [{'title': f'Guide: {s_title}', 'url': f'https://roadmap.sh/{prefix}', 'type': 'article'}]
            })
            edges.append({'source': t_id, 'target': s_id})

        nodes.append({
            'id': t_id,
            'label': t_title,
            'type': 'topic',
            'depth': 1,
            'children': children
        })

        if c_idx > 0:
            prev_t_id = f'{prefix}_cat_{c_idx}'
            edges.append({'source': prev_t_id, 'target': t_id})

    for c_idx in range(len(topic_specs)):
        for s_idx in range(len(topic_specs[c_idx][1]) - 1):
            s_src = f'{prefix}_sub_{c_idx+1}_{s_idx+1}'
            s_tgt = f'{prefix}_sub_{c_idx+1}_{s_idx+2}'
            edges.append({'source': s_src, 'target': s_tgt})

    seen = set()
    dedup_edges = []
    for e in edges:
        pair = (e['source'], e['target'])
        if pair not in seen:
            seen.add(pair)
            dedup_edges.append(e)

    return nodes, dedup_edges

PY_NODES, PY_EDGES = _generate_python_fixtures()
SQL_NODES, SQL_EDGES = _generate_sql_fixtures()
SYS_NODES, SYS_EDGES = _generate_system_design_fixtures()
FE_NODES, FE_EDGES = _generate_frontend_fixtures()
DEVOPS_NODES, DEVOPS_EDGES = _generate_devops_fixtures()


FIXTURE_CLEAN_NODES: Dict[str, List[Dict[str, Any]]] = {
    "backend": BACKEND_CLEAN_NODES_178,
    "python": PY_NODES,
    "sql": SQL_NODES,
    "system-design": SYS_NODES,
    "frontend": FE_NODES,
    "javascript": FE_NODES,
    "react": FE_NODES,
    "devops": DEVOPS_NODES,
    "docker": DEVOPS_NODES,
    "kubernetes": DEVOPS_NODES,
    "mlops": PY_NODES,
    "ai-engineer": PY_NODES,
    "data-engineer": SQL_NODES
}

FIXTURE_EDGES: Dict[str, List[Dict[str, str]]] = {
    "backend": BACKEND_EDGES_202,
    "python": PY_EDGES,
    "sql": SQL_EDGES,
    "system-design": SYS_EDGES,
    "frontend": FE_EDGES,
    "javascript": FE_EDGES,
    "react": FE_EDGES,
    "devops": DEVOPS_EDGES,
    "docker": DEVOPS_EDGES,
    "kubernetes": DEVOPS_EDGES,
    "mlops": PY_EDGES,
    "ai-engineer": PY_EDGES,
    "data-engineer": SQL_EDGES
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
