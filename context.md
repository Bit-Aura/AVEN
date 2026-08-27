# Codebase Context

## Tech Stack & Architecture
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Flow (`@xyflow/react`), TanStack Query, Zustand, Drizzle ORM. Clerk for Auth.
- **Backend**: FastAPI, Python 3.12, Pydantic v2, SQLAlchemy 2.0 (async), Alembic.
- **Database (Transactional)**: PostgreSQL 16 with `pgvector` for semantic search.
- **Database (Graph)**: Neo4j (Community Edition 5.20.0).
- **AI Integration**: Strict `AIProvider` wrapper for Anthropic SDK. The LLM explains and parses but does NOT make final authoritative decisions on prerequisites, mastery, or constraints.
- **Deployment**: Docker Compose for local (Postgres, Neo4j, FastAPI, Next.js).
- **Architecture Principle**: AI interprets and explains; deterministic domain engine decides.

## Core Features
- **Goal Chat**: Natural-language goal capture parsing into typed `GoalIntent`.
- **Cold-Start Conversational Diagnostic**: Evaluates baseline skills immediately without boring forms.
- **Deterministic Skill Graph**: React Flow renders DAG mapping. The shortest valid route is deterministically derived from unmet prerequisites via NetworkX.
- **What-If-Skip Simulation**: Simulates downstream consequence of skipping a node and visually explains the trade-off.
- **Prove-It Assessment Gates**: Updates confidence scores by requiring auto-gradable evidence (micro-quizzes, code snippets) instead of just "Mark Complete".
- **Bayesian Knowledge Tracing (Confidence Scoring)**: Real posterior probabilities for skill mastery driving a Readiness Vector and Trust Panel.
- **Failure Root-Cause Backtrace**: If a node fails, the system walks backward through edges to find weak upstream prerequisites and prescribes a refresher.
- **Market-Drift Reweighting / Job Scraping**: Background ETL (`apps/api/app/scraper/`) fetching live jobs (Greenhouse, Lever) to recalibrate required skills.
- **Time-Travel / Undo**: Instant state reversion via snapshot engine.
- **Day-One Simulator**: Corporate environment simulation (Kanban, Mock PRs, Stakeholder Chat).

## Data Models & State Management
- **Frontend State**: Managed heavily via Zustand and TanStack Query.
- **Graph State**: Stored in Neo4j (nodes for skills, directed edges for prerequisites), traversed in backend via NetworkX.
- **Relational Data**: PostgreSQL stores user profiles, `GoalIntent` structures, skill mastery confidence estimates, resource definitions, and `PathVersion` logs.
- **Path Re-planning**: Paths are immutable. Any change creates a new `PathVersion` tracking the parent version, trigger event, changed nodes, and timestamp.

## API Routes & External Integrations
- **Auth**: Clerk integration (middleware).
- **Job Scraping**: Custom ETL pulling ATS data from Greenhouse, Lever, Ashby, etc.
- **AI**: Anthropic SDK wrapped strictly through `AIProvider` protocol.

## Recent Updates & Active Development
- Integrated **Platform Admin & Resource Curation Engine** (`admin.py`, `auth.py`).
- Integrated **Opportunity Alerts** and real-time job scraping.
- Integrated **Staleness Warnings** & Ebbinghaus decay background worker.
- Added **Cohort Rings & Peer Presence** for collaborative learning.

## Known Quirks & Technical Debt
- **Cold-Start Trust Score**: The day-one Bayesian Knowledge Tracing score is noisy due to lack of evidence.
- The LLM's outputs are heavily schema-validated, meaning failing Pydantic validation acts as a strict firewall.
- **Temporal and OpenTelemetry** were explicitly deferred in favor of FastAPI BackgroundTasks and structured JSON logging.
