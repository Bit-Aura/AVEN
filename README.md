# AVEN — Autonomous Career Pathfinder & Deterministic Skill Graph Engine

<div align="center">

```
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

## 🌟 Executive Overview

**AVEN** is an end-to-end, enterprise-ready career engineering platform designed to eliminate the hallucination and generic advice inherent in traditional AI tutoring. 

Instead of treating Large Language Models as unconstrained planners, **AVEN** decouples cognitive reasoning from execution:
1. **Deterministic Skill DAG (Neo4j)** enforces mathematically strict prerequisite sequences, topological sorts, and domain pathways.
2. **Bayesian Knowledge Tracing (BKT)** dynamically tracks mastery probabilities $P(L_t)$ across every micro-concept based on live coding attempts, diagnostic conversations, and checkpoint assessments.
3. **Multi-Source ATS Scraping Pipeline** continuously harvests live job postings from Greenhouse, Ashby, Lever, Amazon, and Google, synthesizing real-time interview requirements into actionable learning sprints.
4. **Grounded AI Generation** operates purely on strict `DecisionTrace` vectors from the graph, guaranteeing 100% grounded explanations without fabrication.

---

## 🏛️ System Architecture

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

---

## 🚀 Core Features & Flagship Innovations

### 1. 💼 Day-One Corporate Simulator
* **Interactive 5-Column Kanban Board**: Manages real-world engineering sprints across `Backlog`, `To Do`, `In Progress`, `PR In Review`, and `Done`.
* **Stakeholder Chatbot with RAG Memory**: Multi-turn, ticket-aware conversational Slack chat simulating:
  * **Product Manager**: Clarifies business objectives, edge cases, scope, and user personas.
  * **Non-Technical Client**: Explains domain problems in layman's terms with dynamic AI retrieval from the ticket specifications.
* **Monaco IDE Editor**: Full-featured VS-Dark code editor with automatic multi-language detection (`Python`, `SQL`, `TypeScript`, `Bash`), auto-indentation, and syntax validation.
* **Floating 3-Pane Fullscreen Mode**:
  * **Left Pane**: Ticket specifications, acceptance criteria, and schema requirements.
  * **Center Pane**: Full-height Monaco Code Editor with live line jumper.
  * **Right Pane**: Interactive PR Code Review inspector showing Senior Dev feedback, blocker badges (`BLOCKER`, `SUGGESTION`, `LINT`), and one-click jump-to-line links.
* **Automated Acceptance PR Evaluation**: Parses submitted code against deterministic acceptance criteria, rejecting non-compliant code with line-by-line feedback and updating learner BKT mastery upon approval.

---

### 2. ⚔️ Dynamic Placement War Room & Sprint Planner
* **Zero Hardcoding**: Dynamically synthesizes real-world hiring profiles for **any** tech company or startup entered by the learner.
* **Domain-Aware Curriculum Synthesis**: Automatically detects active career domains (e.g. *Backend Software Engineer*, *Full-Stack*, *AI/ML*, *DevOps*) from the database and matches the company's real-world tech stack with ground-truth Neo4j skill nodes.
* **Balanced Sprint Generation**: Distributes target competencies evenly across the timeline (e.g. 6-week sprints) ensuring no weeks are left blank or without concrete challenge gates.
* **Stress Index & Feasibility Engine**: Computes weekly study pace requirements, market demand pressure, and historical pass rates to calculate an overall preparation stress percentage.

---

### 3. 📡 Market Demand Radar (Live ATS ETL Scraping Engine)
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

---

### 4. 🧑‍🏫 Mentor Connect & Learner 360° Knowledge Inspector
* **First-Come-First-Served (FCFS) Escalation Queue**: Learners stuck on difficult skills can request 1-on-1 sessions, complete with reason, skill ID, and requested duration.
* **Algorithmic Mentor Triage Queue**: Sorts learners by breakthrough leverage:
  $$\text{Triage Score} = \text{Readiness} \times (1 + \text{Urgency}) \times \text{Proximity Bonus}$$
* **Embedded Jitsi Video Meeting Rooms**: Direct browser-based WebRTC video conferencing with room auto-provisioning and post-session takeaway logging.
* **Standalone Learner 360° Intelligence Center (`/mentor/learner-intel`)**:
  * **Real Database Discovery**: Automatically lists all real enrolled students without mock or dummy fallbacks.
  * **Visual Skill Graph Matrix**: Real-time display of all syllabus nodes with exact BKT mastery percentages ($P(L)$), status pills (`MASTERED`, `IN PROGRESS`, `LAGGING`), and dependency prerequisites.
  * **Frontier Node Spotlight**: Pinpoints the exact active bottleneck node in the graph where the student is blocked.
  * **Executive Coaching Brief**: AI + Graph synthesized summary diagnosing learning blockers, root-cause deficiencies, and 3 curated coaching talking points.
  * **Diagnostic Activity Log**: Full chronological timeline of Prove-It assessment scores, sandbox code submissions, and mock interview reports.

---

### 5. 🎙️ AI Voice Mock Interviewer
* **Resume Parsing Engine**: Upload PDF/DOCX resumes with automated OCR text extraction and skill verification.
* **Real-Time Speech Recognition**: Browser-native 16kHz audio stream processing with downsampling and live transcription.
* **Multi-Turn Interview Phases**: Walks the candidate through *Technical Fundamentals*, *System Design*, *Coding Trade-Offs*, and *Behavioral Questions*.
* **Comprehensive Evaluation Matrix**: Generates rubrics on Technical Knowledge, Communication Clarity, Resume Honesty, and detected skill gaps.

---

### 6. 🛡️ Role-Based Access Control (RBAC) & Authentication
* **Strict Role Routing**: Instant separation between `LEARNER`, `MENTOR`, and `ADMIN` personas.
* **Diagnostic Exemption for Mentors & Admins**: Mentors and platform administrators automatically bypass cold-start diagnostics and are routed directly to operational control centers.
* **IDOR Protection**: Session endpoints enforce cryptographic user ownership and mentor assignment verification on every state mutation.

---

## 🧮 Mathematical & Algorithmic Formulations

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

---

### 2. Algorithmic Mentor Triage Scoring
$$\text{Priority} = \text{Readiness} \cdot \left(1 + \max\left(0, 1 - \frac{D_{\text{needed}}}{D_{\text{available}}}\right)\right) \cdot \text{ProximityBonus}$$

Where:
$$\text{ProximityBonus} = \begin{cases} 1.5 & \text{if } 0.80 \le \text{Readiness} \le 0.95 \text{ (Breakthrough Zone)} \\ 1.0 & \text{otherwise} \end{cases}$$

---

## 📁 Monorepo Structure

```
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
├── docker-compose.yml                # Multi-Container Orchestration
└── README.md                         # Comprehensive System Documentation
```

---

## 🛠️ Local Installation & Development Setup

### 1. Prerequisites
* **Node.js**: `v20.0.0` or higher
* **Python**: `v3.11.0` or higher
* **Docker & Docker Compose**: For containerized databases (PostgreSQL + Neo4j)

---

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

---

### 3. Launch Databases via Docker Compose
Start PostgreSQL 16 (with `pgvector`) and Neo4j 5.20:
```bash
docker compose up db neo4j -d
```

* **PostgreSQL**: `localhost:5432`
* **Neo4j Browser**: `http://localhost:7474` (Bolt: `localhost:7687`)

---

### 4. Setup and Run the FastAPI Backend
```bash
# Navigate to API directory
cd apps/api

# Create & activate Python virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations & seed skill graph
python -m app.services.seeder

# Start API server with auto-reload
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API Documentation will be live at `http://localhost:8000/docs`.

---

### 5. Setup and Run the Next.js Frontend
```bash
# Navigate to Web directory
cd apps/web

# Install npm dependencies
npm install

# Start Next.js development server
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🧪 Testing & Quality Assurance

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

## 👥 Roles & Access Permissions

| Role | Access URL | Capabilities |
|---|---|---|
| **Learner** | `/learner` | Personalized Skill DAG, Prove-It assessments, Day-One Simulator, AI Voice Mock Interview, War Room sprint planner. |
| **Mentor** | `/mentor` | FCFS escalation queue, Jitsi video session provisioning, Learner 360° Diagnostic Explorer (`/mentor/learner-intel`), and assigned session manager (`/mentor/sessions`). |
| **Admin** | `/admin` | Resource curation CRUD, user audit logs, system telemetry, and platform-wide database oversight. |

---

## 📜 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
