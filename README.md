# AVEN — Autonomous Career Pathfinder & Deterministic Skill Graph Engine

<div align="center">

```text
   █████╗ ██╗   ██╗███████╗███╗   ██╗
  ██╔══██╗██║   ██║██╔════╝████╗  ██║
  ███████║██║   ██║█████╗  ██╔██╗ ██║
  ██╔══██║╚██╗ ██╔╝██╔══╝  ██║╚██╗██║
  ██║  ██║ ╚████╔╝ ███████╗██║ ╚████║
  ╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═══╝
```

**Production-Grade AI Learning Architecture Powered by Deterministic Neo4j Skill Graphs, Bayesian Knowledge Tracing (BKT), and Real-Time ATS Scraping**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.0_App_Router-black.svg?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776ab.svg?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.20_Graph_DB-008cc1.svg?style=flat-square&logo=neo4j&logoColor=white)](https://neo4j.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_+_pgvector-4169e1.svg?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

</div>

---

## Executive Overview

**AVEN** is an end-to-end, enterprise-ready career engineering platform designed to eliminate the hallucination and generic advice inherent in traditional AI tutoring. 

Instead of treating Large Language Models as unconstrained planners, **AVEN** decouples cognitive reasoning from execution:
1. **Deterministic Skill DAG (Neo4j)** enforces mathematically strict prerequisite sequences, topological sorts, and domain pathways.
2. **Bayesian Knowledge Tracing (BKT)** dynamically tracks mastery probabilities $P(L_t)$ across every micro-concept based on live coding attempts, diagnostic conversations, and checkpoint assessments.
3. **Multi-Source ATS Scraping Pipeline** continuously harvests live job postings from Greenhouse, Ashby, Lever, Amazon, and Google, synthesizing real-time interview requirements into actionable learning sprints.
4. **Grounded AI Generation** operates purely on strict `DecisionTrace` vectors from the graph, guaranteeing 100% grounded explanations without fabrication.

---

## System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer["Frontend Layer (Next.js 15 App Router + React Flow)"]
        UI_Learner["Learner Workspace (/learner)"]
        UI_Simulator["Day-One Simulator (/learner/simulator)"]
        UI_WarRoom["Placement War Room (/war-room)"]
        UI_Radar["Market Demand Radar (/market-radar)"]
        UI_Mentor["Mentor Connect & 360° Intel (/mentor)"]
        UI_Interview["AI Mock Interview (/learner/interview)"]
    end

    subgraph APILayer["Backend Engine (FastAPI Async)"]
        Router_Auth["Auth & RBAC Router (/api/v1/auth)"]
        Router_Path["Path & Graph Router (/api/v1/path)"]
        Router_Sim["Simulator & PR Review (/api/v1/simulator)"]
        Router_Place["Placement & War Room (/api/v1/placement)"]
        Router_Scraper["Live ATS Scraper (/api/v1/scraper)"]
        Router_Mentor["Mentor Connect & Triage (/api/v1/mentor-connect)"]
        Router_Interview["AI Voice Interview (/api/v1/interview)"]
    end

    subgraph DataLayer["Data & Knowledge Stores"]
        Neo4j[("Neo4j 5.20 Graph Database\n(Skill DAGs, Competency Nodes, Prereqs)")]
        Postgres[("PostgreSQL 16 + pgvector\n(User Profiles, BKT States, Attempts, Resumes)")]
        SQLite[("Local Cache DB\n(Dynamic Company Profiles, Telemetry)")]
    end

    subgraph ExternalServices["External APIs & AI Services"]
        LLM["AI Gateway (Ollama / Anthropic Claude / DeepSeek)"]
        ATS["Live ATS Endpoints (Ashby, Greenhouse, Lever, Amazon, Google)"]
        Jitsi["Jitsi Meet Server (Embedded Video Rooms)"]
    end

    ClientLayer --> APILayer
    APILayer --> DataLayer
    APILayer --> ExternalServices
    Router_Scraper --> ATS
    Router_Place --> Neo4j
    Router_Sim --> LLM
    Router_Mentor --> Jitsi
```

### Architecture — Text Form
1. The **Next.js 15 Client Layer** serves distinct, role-based workspaces for Learners and Mentors.
2. The **FastAPI Backend Engine** handles high-performance, asynchronous routing for placement, simulation, and ATS scraping.
3. The **Data Layer** separates concerns: Neo4j manages the topological skill DAGs, while Postgres+pgvector handles BKT state and user telemetry.
4. The **External Services** integrate with external AI gateways for inference, live ATS endpoints for market data, and Jitsi WebRTC servers to execute complex domain workflows securely.

---

## Why We Built It This Way

The core engineering philosophy behind AVEN is **Determinism over Hallucination**. 
While Large Language Models (LLMs) are exceptional at semantic reasoning, they are inherently probabilistic and make poor state engines or curriculum planners. We decouple cognitive reasoning from strict domain logic.

* **Deterministic logic where correctness matters**: Skill prerequisites, mastery calculations, and curriculum validation are strictly managed by traditional algorithms and graph traversals.
* **AI where semantic reasoning is valuable**: Parsing unstructured ATS job postings, simulating conversational roleplay in mock interviews, and performing static code reasoning are handled by the AI Gateway.
* **Evidence-driven personalization**: Instead of guessing what a learner needs, the system synthesizes dynamic learning sprints based on *real-world* job postings intersecting with mathematically tracked learner mastery.

### Technology Decision Matrix

| Decision | Chosen Technology | Why We Chose It | Why Not the Alternatives | Trade-off |
|---|---|---|---|---|
| **Frontend** | **Next.js 15 (App Router)** | Server-side rendering (SSR) enables fast initial loads for complex dashboard metrics, while React Flow natively supports complex interactive graph visualizations. | Pure React SPA (slower initial load, poorer SEO). Vue/Angular (team expertise and React Flow ecosystem). | Slightly higher hosting complexity (requires Node server vs static CDN). |
| **Backend** | **FastAPI (Python)** | Native `asyncio` handles thousands of concurrent long-polling connections (ATS scrapers, IDE WebSocket simulation) with exceptional performance. Python is the lingua franca for data science and AI integration. | Express.js (weaker typing, harder ML integration). Django (too monolithic, synchronous by default). | Requires strict asynchronous discipline; blocking calls will stall the event loop. |
| **Primary DB** | **PostgreSQL 16 + pgvector** | Transactional guarantees for user profiles, BKT state, and application telemetry. `pgvector` enables native similarity search for resumes and job descriptions without needing a separate vector DB. | MongoDB (lacks strong transactional guarantees and relational integrity for BKT state updates). | Schema migrations required for relational models vs flexible NoSQL. |
| **Graph DB** | **Neo4j 5.20** | Our core learning engine requires repeated traversal of prerequisite relationships. Neo4j makes calculating topological sorts and bottleneck detection a native, first-class operation. | PostgreSQL Recursive CTEs (computationally expensive at scale and harder to model complex semantic relationships). | Introduces operational complexity by requiring a second database to maintain in sync. |
| **AI Gateway** | **Custom Gateway Pattern** | Standardizes inputs/outputs and enforces strict JSON schemas across multiple providers (Anthropic, DeepSeek, local Ollama). Isolates vendor lock-in. | Direct provider SDK calls in UI or scattered across services (brittle, unmaintainable). | Requires building and maintaining internal proxy logic and caching. |
| **LLM Model** | **Claude / DeepSeek** | Excellent at structured JSON extraction, context adherence, and zero-shot code reasoning without hallucinating outside provided rubrics. | Basic GPT-3.5 (too high hallucination rate for strict parsing). | Latency and API cost dependencies for cloud models. |

---

## Why These Data Stores?

We utilize a **polyglot persistence** model to match data structures to their ideal access patterns.

### PostgreSQL (The Transactional State Store)
* **What it stores**: User profiles, Bayesian Knowledge Tracing (BKT) states, historical assessment attempts, and ingested ATS job targets.
* **Why this store?**: Learner progress requires strict ACID compliance. When a learner passes a test, we need absolute certainty that their BKT probability $P(L_t)$ is updated atomically.
* **Why not Neo4j for this?**: Graph databases are inefficient for high-frequency, wide-column transactional updates and aggregations (e.g. counting total passed tests across thousands of users).

### Neo4j (The Deterministic Graph Store)
* **What it stores**: The immutable domain map. Skill nodes (e.g., "Python Loops", "FastAPI Middleware"), prerequisite edges, and competency clusters.
* **Why this store?**: When a learner fails an advanced concept, the engine must traverse backwards to find the root-cause deficiency. Representing this as native graph edges avoids complex, deeply nested SQL joins.
* **Why not PostgreSQL for this?**: While PostgreSQL *can* use recursive CTEs to traverse hierarchies, traversing deep, multi-parent DAGs scales poorly and is conceptually misaligned with a relational schema.

**The Trade-off**: Maintaining two databases introduces data synchronization overhead. We mitigate this by keeping Neo4j relatively static (the map) and PostgreSQL highly dynamic (the player's position on the map).

---

## Why AI Is Used This Way

AVEN strictly bounds AI capabilities using an internal AI Gateway. 

**AI is appropriate for:**
* **Semantic Interpretation**: Extracting structured constraints from natural language ("I want to be a backend dev in 3 months").
* **Code Reasoning**: Performing static semantic analysis on submitted PRs based on a strict `DecisionTrace` rubric.
* **Conversational Coaching**: Simulating PM or Client personas in the Day-One simulator.

**Deterministic Logic is appropriate for:**
* **BKT Mastery Updates**: The AI does not decide if a student "leveled up". The math does.
* **Path Generation**: The AI does not generate a course list. Neo4j calculates the topological path based on ATS gaps.
* **API Validation**: Pydantic models strictly validate and coerce every AI JSON output.

**Why not let the LLM generate the entire path?**
LLMs hallucinate non-existent prerequisites, forget dependencies, and cannot reliably maintain global state over long horizons. By forcing the LLM to output only JSON choices that map to deterministic graph nodes, we achieve 100% reliability.

---

## Why Bayesian Knowledge Tracing (BKT)?

**The Problem**: Simple completion percentages (e.g., "You are 80% done with Python") are pedagogically useless. They do not account for lucky guesses or momentary slips, nor do they degrade over time without use.

**The Solution**: We implemented standard Bayesian Knowledge Tracing (BKT) to model mastery as a hidden probabilistic state. 
* It explicitly accounts for $P(Guess)$ and $P(Slip)$.
* If a learner solves a hard problem but fails an easy prerequisite, BKT mathematically degrades the prerequisite's probability, triggering the Neo4j engine to dynamically route them back for remedial review.
* **Limitations**: BKT assumes a relatively static probability of transition $P(T)$ per skill, which may not capture complex multi-skill transfer learning perfectly, but it is vastly superior to binary pass/fail tracking for our prototype.

---

## Why a Skill Graph?

Why not just use a flat list of courses like a traditional LMS?

1. **Root-Cause Analysis**: If a student fails a "FastAPI Middleware" assessment, the system walks the graph backward to "Python Decorators" and "HTTP Protocols" to find the true gap.
2. **Adaptive Replanning**: Flat courses force linear progression. A DAG allows the Planner to dynamically bypass nodes the learner already knows and re-route around specific weak points based on realtime BKT probabilities.
3. **Domain Intersections**: A skill like "SQL Joins" belongs to both "Backend Engineering" and "Data Analytics". A graph inherently models these intersections without duplication.

---

## Core Data Flow: From ATS Scraping to BKT Update

The following diagram illustrates the complete, end-to-end data flow that makes AVEN a deterministic powerhouse.

```mermaid
sequenceDiagram
    participant ATS as Live ATS Endpoints
    participant Scraper as Multi-Source ETL Pipeline
    participant DB as Postgres + Neo4j
    participant Planner as Placement War Room
    participant Sim as Day-One Simulator
    participant BKT as BKT Engine

    ATS->>Scraper: Polled Job Postings (JSON/HTML)
    Scraper->>Scraper: Normalize & Deduplicate
    Scraper->>DB: Persist Target Competencies
    Planner->>DB: Fetch Learner Profile & ATS Targets
    Planner->>Planner: Synthesize Domain-Aware Sprint
    Planner->>Sim: Generate Interactive Kanban Ticket
    Sim->>Sim: Learner Submits PR Code
    Sim->>BKT: Evaluate Acceptance Criteria
    BKT->>DB: Update Mastery Probability P(Lt)
```

### Core Data Flow — Text Form
1. The **Multi-Source ETL Pipeline** continuously polls Live ATS Endpoints for real-world job requirements.
2. The pipeline normalizes, deduplicates, and persists these target competencies into the database.
3. The **Placement War Room** fetches the learner's current BKT profile and compares it against these ATS targets to synthesize a specialized sprint.
4. The **Day-One Simulator** generates a ticket, accepts learner PR submissions, and sends results to the BKT Engine, which subsequently updates the learner's true mastery state in the database.

---

## Architecture Hardening & Production Readiness

To ensure a streamlined, highly maintainable, and reliable production deployment, we deliberately avoided over-engineering with unnecessary infrastructure components. The system is designed to scale horizontally using native asyncio concurrency.

### Deliberate Non-Decisions
* **Why not Redis or Celery?**: We replaced heavyweight task queues and external caches with native Python `asyncio.create_task` and localized TTL caching (e.g., in our LLM adapters). For background tasks like our initial data seeder and ATS scraper, they run as long-lived async tasks bound to the FastAPI event loop. 
* **Why not Kafka or RabbitMQ?**: A message broker or event streaming platform is not required because our data ingestion (ATS scraping) is batch-oriented and doesn't require distributed pub/sub semantics. The scale of job postings easily fits within simple PostgreSQL inserts and asynchronous HTTP polling.
* **Why not Microservices?**: A modular monolith approach minimizes deployment complexity and network latency while allowing us to cleanly separate concerns via FastAPI routers.

### Implemented Safeguards
* **In-Memory Rate Limiting**: AI endpoints are protected by a lightweight, in-memory rate-limiter middleware (10 requests/min per IP) to prevent expensive LLM abuse. While a multi-node deployment would typically require Redis, our single-instance deployment model operates efficiently with an in-memory cache, reducing operational complexity.
* **Global Exception Handling**: Custom FastAPI exception handlers capture all `StarletteHTTPException`, `RequestValidationError`, and generic `Exception` events to log errors cleanly and return uniform JSON, preventing stack trace leaks.
* **Database Pooling Strategy**: We leverage SQLAlchemy's robust connection pooling (`pool_size=20`, `max_overflow=10`, `pool_timeout=30.0`) to handle concurrent database spikes smoothly, avoiding connection exhaustion during heavy load bursts.
* **Exponential Backoff**: The AI Gateway (`gateway.py`) and the Neo4j client implement strict retry loops with exponential backoff (`await asyncio.sleep(2 ** attempt)`) to transparently handle upstream API rate limits, transient network failures, and container startup ordering issues.

---

## Core Features & Flagship Innovations

### 1. Day-One Corporate Simulator
* **Interactive 5-Column Kanban Board**: Manages real-world engineering sprints across `Backlog`, `To Do`, `Enterprise Implementation`, `PR In Review`, and `Done`.
* **Stakeholder Chatbot with RAG Memory**: Multi-turn, ticket-aware conversational Slack chat simulating:
  * **Product Manager**: Clarifies business objectives, edge cases, scope, and user personas.
  * **Non-Technical Client**: Explains domain problems in layman's terms with dynamic AI retrieval from the ticket specifications.
* **Monaco IDE Editor**: Full-featured VS-Dark code editor with automatic multi-language detection (`Python`, `SQL`, `TypeScript`, `Bash`), auto-indentation, and syntax validation.
* **Floating 3-Pane Fullscreen Mode**:
  * **Left Pane**: Ticket specifications, acceptance criteria, and schema requirements.
  * **Center Pane**: Full-height Monaco Code Editor with live line jumper.
  * **Right Pane**: Interactive PR Code Review inspector showing Senior Dev feedback, blocker badges (`BLOCKER`, `SUGGESTION`, `LINT`), and one-click jump-to-line links.
* **Automated Acceptance PR Evaluation**: Parses submitted code against deterministic acceptance criteria, rejecting non-compliant code with line-by-line feedback and updating learner BKT mastery upon approval.

### 2. Dynamic Placement War Room & Sprint Planner
* **Zero Hardcoding**: Dynamically synthesizes real-world hiring profiles for **any** tech company or startup entered by the learner.
* **Domain-Aware Curriculum Synthesis**: Automatically detects active career domains (e.g. *Backend Software Engineer*, *Full-Stack*, *AI/ML*, *DevOps*) from the database and matches the company's real-world tech stack with ground-truth Neo4j skill nodes.
* **Balanced Sprint Generation**: Distributes target competencies evenly across the timeline (e.g. 6-week sprints) ensuring no weeks are left blank or without concrete challenge gates.
* **Stress Index & Feasibility Engine**: Computes weekly study pace requirements, market demand pressure, and historical pass rates to calculate an overall preparation stress percentage.

### 3. Market Demand Radar (Live ATS ETL Scraping Engine)
Asynchronous, multi-adapter data ingestion pipeline in `apps/api/app/scraper/`:

| Source Adapter | Target Platform | Live Endpoint Integration |
|---|---|---|
| `sources/ashby.py` | **Ashby API** | `https://api.ashbyhq.com/posting-api/job-board/{board}` (e.g., OpenAI, Linear, Ramp, Sentry) |
| `sources/greenhouse.py` | **Greenhouse API** | `https://boards-api.greenhouse.io/v1/boards/{token}/jobs` (e.g., Stripe, Figma, Cloudflare) |
| `sources/lever.py` | **Lever API** | `https://api.lever.co/v0/postings/{slug}` (e.g., Palantir, Netflix) |
| `sources/amazon.py` | **Amazon Jobs API** | `https://www.amazon.jobs/en/search.json` |
| `sources/google.py` | **Google Careers API** | `https://careers.google.com/api/v3/search/` |

* **Normalization & Extraction**: Automatically strips raw HTML tags, formats geographic locations, standardizes employment types, and extracts core skill keywords via NLP regex pipelines.
* **Deduplication Engine**: In-memory similarity deduplication to remove repeated cross-team job postings.
* **Live Profile Match Scoring**: Computes the real-time match percentage between active job requirements and the student's verified BKT knowledge state.

### 4. Mentor Connect & Learner 360° Knowledge Inspector
* **First-Come-First-Served (FCFS) Escalation Queue**: Learners stuck on difficult skills can request 1-on-1 sessions, complete with reason, skill ID, and requested duration.
* **Algorithmic Mentor Triage Queue**: Sorts learners by breakthrough leverage:
  $$\text{Triage Score} = \text{Readiness} \times (1 + \text{Urgency}) \times \text{Proximity Bonus}$$
* **Embedded Jitsi Video Meeting Rooms**: Direct browser-based WebRTC video conferencing with room auto-provisioning and post-session takeaway logging.
* **Standalone Learner 360° Intelligence Center (`/mentor/learner-intel`)**:
  * **Real Database Discovery**: Automatically lists all real enrolled students without mock abstraction fallbacks.
  * **Visual Skill Graph Matrix**: Real-time display of all syllabus nodes with exact BKT mastery percentages ($P(L)$), status pills (`MASTERED`, `Enterprise Implementation`, `LAGGING`), and dependency prerequisites.
  * **Frontier Node Spotlight**: Pinpoints the exact active bottleneck node in the graph where the student is blocked.
  * **Executive Coaching Brief**: AI + Graph synthesized summary diagnosing learning blockers, root-cause deficiencies, and 3 curated coaching talking points.
  * **Diagnostic Activity Log**: Full chronological timeline of Prove-It assessment scores, sandbox code submissions, and mock interview reports.

### 5. AI Voice Mock Interviewer
* **Resume Parsing Engine**: Upload PDF/DOCX resumes with automated OCR text extraction and skill verification.
* **Real-Time Speech Recognition**: Browser-native 16kHz audio stream processing with downsampling and live transcription.
* **Multi-Turn Interview Phases**: Walks the candidate through *Technical Fundamentals*, *System Design*, *Coding Trade-Offs*, and *Behavioral Questions*.
* **Comprehensive Evaluation Matrix**: Generates rubrics on Technical Knowledge, Communication Clarity, Resume Honesty, and detected skill gaps.

### 6. Role-Based Access Control (RBAC) & Authentication
* **Strict Role Routing**: Instant separation between `LEARNER`, `MENTOR`, and `ADMIN` personas.
* **Diagnostic Exemption for Mentors & Admins**: Mentors and platform administrators automatically bypass cold-start diagnostics and are routed directly to operational control centers.
* **IDOR Protection**: Session endpoints enforce cryptographic user ownership and mentor assignment verification on every state mutation.

---

## Mathematical & Algorithmic Formulations

### 1. Bayesian Knowledge Tracing (BKT)
For each skill node $k$ and interaction attempt $t$, the probability of mastery $P(L_t)$ is updated via standard Bayesian inference:

$$P(L_{t-1} \mid \text{Correct}) = \frac{P(L_{t-1}) \cdot (1 - P(S))}{P(L_{t-1}) \cdot (1 - P(S)) + (1 - P(L_{t-1})) \cdot P(G)}$$

$$P(L_{t-1} \mid \text{Incorrect}) = \frac{P(L_{t-1}) \cdot P(S)}{P(L_{t-1}) \cdot P(S) + (1 - P(L_{t-1})) \cdot (1 - P(G))}$$

$$P(L_t) = P(L_{t-1} \mid \text{Obs}) + (1 - P(L_{t-1} \mid \text{Obs})) \cdot P(T)$$

Where:
* $P(L_0) = 0.10$ (Prior Mastery)
* $P(T) = 0.15$ (Transition Probability)
* $P(G) = 0.20$ (Guess Probability)
* $P(S) = 0.10$ (Slip Probability)

### 2. Algorithmic Mentor Triage Scoring
$$\text{Priority} = \text{Readiness} \cdot \left(1 + \max\left(0, 1 - \frac{D_{\text{needed}}}{D_{\text{available}}}\right)\right) \cdot \text{ProximityBonus}$$

Where:
$$\text{ProximityBonus} = \begin{cases} 1.5 & \text{if } 0.80 \le \text{Readiness} \le 0.95 \text{ (Breakthrough Zone)} \\ 1.0 & \text{otherwise} \end{cases}$$

---

## Monorepo Structure

```text
AVEN/
├── apps/
│   ├── api/                          # FastAPI Backend Application
│   │   ├── app/
│   │   │   ├── core/                 # Config, DB connections, Auth & Security
│   │   │   ├── infrastructure/       # Neo4j Client, AI Gateway (Ollama/Claude)
│   │   │   ├── models/               # SQLAlchemy 2.0 Domain Entities
│   │   │   ├── routers/              # REST Endpoints
│   │   │   │   ├── auth.py           # Authentication & Session Sync
│   │   │   │   ├── path.py           # Skill DAG & Path Versioning
│   │   │   │   ├── simulator.py      # Simulator Kanban, Chat & PR Reviews
│   │   │   │   ├── placement.py      # War Room & Sprint Plan Generators
│   │   │   │   ├── mentor_connect.py # Mentor FCFS Queue & 360° Intel
│   │   │   │   ├── scraper.py        # ATS Scraping REST Endpoints
│   │   │   │   └── interview.py      # AI Mock Interview Engine
│   │   │   ├── scraper/              # Multi-Source ATS ETL Pipeline
│   │   │   │   ├── sources/          # Ashby, Greenhouse, Lever, Amazon, Google
│   │   │   │   ├── deduplicator.py   # In-Memory Job Deduplication
│   │   │   │   ├── normalizer.py     # HTML Cleaners & Formatters
│   │   │   │   └── pipeline.py       # Main Scraping Pipeline Orchestrator
│   │   │   ├── services/             # Core Business Logic (PlacementEngine, etc.)
│   │   │   └── main.py               # Application Factory & Middleware
│   │   ├── pyproject.toml            # Poetry / Pip Dependency Configuration
│   │   └── tests/                    # Pytest Backend Test Suite
│   │
│   └── web/                          # Next.js 15 App Router Frontend
│       ├── src/
│       │   ├── app/                  # App Router Structure
│       │   │   ├── (auth)/           # Sign-In & Sign-Up Routes
│       │   │   ├── (onboarding)/     # Conversational Diagnostic (/diagnostic)
│       │   │   └── (dashboard)/      # Protected Role Dashboards
│       │   │       ├── learner/      # Learning Path, Graph, Portfolio, Simulator
│       │   │       │   ├── simulator/# Day-One Simulator Workspace
│       │   │       │   └── interview/# AI Voice Mock Interview
│       │   │       ├── mentor/       # Mentor Connect & Operations
│       │   │       │   ├── learner-intel/ # Standalone 360° Intel Center
│       │   │       │   └── sessions/ # Assigned 1-on-1 Sessions
│       │   │       ├── war-room/     # Placement Season War Room
│       │   │       └── market-radar/ # Live Market Demand Radar
│       │   ├── components/           # Modular React & Tailwind Component Library
│       │   │   ├── assessment/       # Prove-It Quizzes & Challenges
│       │   │   ├── auth/             # RoleGuard & Permission Shields
│       │   │   ├── layout/           # Sidebar, Navbar, PresenceBar
│       │   │   └── mentor/           # Jitsi Meeting Modals & Schedulers
│       │   ├── store/                # Zustand State Stores (usePathStore, etc.)
│       │   ├── api/                  # Typed Client API Connectors
│       │   └── lib/                  # Speech Recognition & Clerk Safety Wrappers
│       └── package.json              # Node Dependencies & Scripts
│
├── graph/                            # Neo4j Seed Scripts & Cypher Schemas
├── docs/                             # Extensive Architecture and Feature Documentation
├── docker-compose.yml                # Multi-Container Orchestration
└── README.md                         # Comprehensive System Documentation
```

---

## Local Installation & Development Setup

### 1. Prerequisites
* **Node.js**: `v20.0.0` or higher
* **Python**: `v3.11.0` or higher
* **Docker & Docker Compose**: For containerized databases (PostgreSQL + Neo4j)

### 2. Environment Configuration
Copy the sample environment file and configure your keys:
```bash
cp .env.example .env
```

Key environment variables:
```env
# Backend Database & Ports
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/pathfinder
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=pathfinder_secret

# AI Gateway (Local Ollama or Cloud Provider)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:latest

# Frontend Config
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 3. Launch Databases via Docker Compose
Start PostgreSQL 16 (with `pgvector`) and Neo4j 5.20:
```bash
docker compose up db neo4j -d
```
* **PostgreSQL**: `localhost:5432`
* **Neo4j Browser**: `http://localhost:7474` (Bolt: `localhost:7687`)

### 4. Setup and Run the FastAPI Backend
```bash
cd apps/api
python -m venv .venv
.\.venv\Scripts\activate # (or source .venv/bin/activate)
pip install -r requirements.txt
python -m app.services.seeder
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API Documentation will be live at `http://localhost:8000/docs`.

### 5. Setup and Run the Next.js Frontend
```bash
cd apps/web
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Testing & Quality Assurance

### Run Backend Unit & Integration Tests
```bash
cd apps/api
pytest -v
```

### Run Frontend TypeScript Compilation & Unit Tests
```bash
cd apps/web
npx tsc --noEmit
npm test
```

---



## Roles & Access Permissions

| Role | Access URL | Capabilities |
|---|---|---|
| **Learner** | `/learner` | Personalized Skill DAG, Prove-It assessments, Day-One Simulator, AI Voice Mock Interview, War Room sprint planner. |
| **Mentor** | `/mentor` | FCFS escalation queue, Jitsi video session provisioning, Learner 360° Diagnostic Explorer (`/mentor/learner-intel`), and assigned session manager (`/mentor/sessions`). |
| **Admin** | `/admin` | Resource curation CRUD, user audit logs, system telemetry, and platform-wide database oversight. |

---

## Deep Dive Documentation
For comprehensive architectural specifications and subsystem deep dives, explore our extensive documentation:
- [System Architecture High-Level & Low-Level Design](docs/PROJECT_SYSTEM_ARCHITECTURE_HLD_LLD.md)
- [Authentication and Authorization Flow](docs/features/authentication-flow.md)
- [Assessment and Calibration (Prove-It Gates)](docs/features/Feature_Prove_It_Gates.md)
- [Learner Dashboard and Pathing](docs/features/Feature_Dashboard_Skill_Graph.md)
- [AI Coaching and Interviews](docs/features/Feature_AI_Coach.md)
- [Offline Resilience UI](docs/features/Feature_Offline_Resilience_UI.md)

---

## License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
