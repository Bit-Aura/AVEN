# Career PathFinder

An AI-powered personalized learning path recommender where a deterministic skill graph does the planning, a short diagnostic conversation replaces standard quizzes, and the AI explains decisions based strictly on ground-truth data.

## Monorepo Architecture

This project is organized as a monorepo containing:
- **Backend (`apps/api`)**: FastAPI application, async SQLAlchemy 2.0, PostgreSQL 16 with `pgvector`, official `neo4j` driver, NetworkX for graph traversal, and direct Anthropic SDK calls wrapped in a typed `AIProvider` gateway.
- **Frontend (`apps/web`)**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Drizzle ORM + Clerk Auth + React Flow (`@xyflow/react`) for skill-graph prerequisite map visualization, TanStack Query, and Zustand.
- **Shared Types (`packages/shared-types`)**: OpenAPI-generated TypeScript types shared across the stack to keep API schemas and client models synchronized.
- **Graph (`graph/`)**: Cypher scripts defining uniqueness constraints and schemas for skill graph nodes and prerequisite relationships.
- **Scripts (`scripts/`)**: Automated type-generation pipelines.

---

## Technical Stack & Infrastructure

- **Transactional DB**: PostgreSQL 16 + `pgvector` (with SQLAlchemy 2.0 Async in FastAPI and Drizzle ORM in Next.js)
- **Graph DB**: Neo4j Community Edition 5.20.0 (Cypher queries & NetworkX traversal)
- **Authentication**: Clerk Auth with Next.js edge middleware (`src/middleware.ts`)
- **AI Gateway**: Protocol-based integration of Anthropic SDK (with a functional mock provider for tests)
- **Frontend Architecture**: Next.js 15 App Router organized into route groups:
  - `(auth)`: Sign-in / Sign-up with Clerk
  - `(onboarding)`: Conversational Diagnostic onboarding (`/diagnostic`)
  - `(dashboard)`: Dedicated views for `/learner`, `/learner/graph`, `/learner/portfolio`, `/mentor`, and `/admin`
  - Internal Next.js Route Handlers: `/api/chat`, `/api/assessment/submit`
- **Visualization**: React Flow (xyflow) for interactive directed acyclic graphs (DAGs)

---

## Core Runtime Pipeline

1. **Intent Parsing**: User natural-language goal $\rightarrow$ validated `GoalIntent` (Pydantic schema).
2. **Semantic Mapping**: Embed and match user-input skills to database nodes using `pgvector` cosine similarity.
3. **Graph Traversal**: Retrieve subgraphs from Neo4j, build in NetworkX, and perform a deterministic topological sort of unmet prerequisites.
4. **Resource Retrieval & Ranking**: Match resources against constraints (time budget, modality) and rank them.
5. **Grounded Explanation**: Generate natural language reasons explaining recommendations using a strict `DecisionTrace` (no hallucination).
6. **Dashboard Rendering**: Present path milestones in the frontend with React Flow and modular learner components.

---

## Local Dev Setup

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and fill in the required keys:
```bash
cp .env.example .env
```

### 2. Launch Services via Docker Compose
Start PostgreSQL, Neo4j, FastAPI API, and Next.js frontend services:
```bash
docker-compose up --build
```
- **FastAPI API**: `http://localhost:8000` (docs available at `/docs`)
- **Next.js Frontend**: `http://localhost:8080` (or `http://localhost:3000` locally via `npm run dev`)
- **Neo4j Browser**: `http://localhost:7474` (Bolt port at `7687`)

### 3. Apply Initial Database Migrations
Once the database container is healthy, run the migrations:
```bash
docker-compose exec api alembic upgrade head
```

---

## Shared Type Generation Pipeline

If backend Pydantic models or FastAPI endpoints change, regenerate the shared TypeScript models for the frontend:
```bash
./scripts/generate-types.sh
```
This script boots up the API, extracts the OpenAPI schema, and generates a unified typed definition at `packages/shared-types/index.d.ts`.

---

## Running Tests

To run the backend test suite locally on the host:
1. Initialize a Python virtual environment and activate it:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install fastapi pydantic pydantic-settings sqlalchemy asyncpg pgvector alembic instructor anthropic networkx neo4j uvicorn pytest pytest-asyncio
   ```
3. Run the tests:
   ```bash
   PYTHONPATH=apps/api pytest apps/api
   ```

To run the frontend test suite:
```bash
cd apps/web && npm test
```

---

## Built Features & Component Library

- **Dashboard & Skill Graph (Frontend)**: Highly interactive, visually stunning React Flow graph for displaying the learning path, powered by strict Zustand state management and fully testable architecture. (See `docs/Feature_Dashboard_Skill_Graph.md`)
- **Goal Chat UI (Frontend)**: An immersive, beautifully styled natural-language input interface that seamlessly captures the user's initial goal and conditionally transitions into the dashboard. (See `docs/Feature_Goal_Chat.md`)
- **Cold-Start Diagnostic UI (Frontend)**: A sleek, bounded conversational UI (`/diagnostic`) that effectively estimates a learner's baseline skills right after onboarding, preventing the "cold-start" problem without relying on boring forms. (See `docs/Feature_Diagnostic_Chat.md`)
- **What-If-Skip Simulation UI (Frontend)**: Empowers learners to negotiate their path by previewing the downstream consequences of skipping a milestone, complete with immersive visual graph feedback. (See `docs/Feature_What_If_Skip.md`)
- **Prove-It Assessment & Micro-Assessment Gates**: Seamlessly integrated quiz and challenge interfaces (`MicroAssessmentModal.tsx`, `ProveItAssessment.tsx`) that allow confident learners to prove their skills and update BKT mastery probabilities. (See `docs/Feature_Prove_It_Gates.md`)
- **Trust Panel & Readiness Vector UI**: Eliminates the "black box" by showing the learner exactly why the AI generated their path, visualizing their progress toward their ultimate goal. (`TrustPanel.tsx`, `ReadinessBar.tsx`) (See `docs/Feature_Trust_Panel.md`)
- **Live Multi-Cursor/Presence & Cohort Rings**: Collaboration bars and cohort challenge rings (`PresenceBar.tsx`, `CohortRing.tsx`, `PeerPresenceBadge.tsx`) showing active peer motivation and study rings. (See `docs/Feature_Presence_UI.md`)
- **Context-Aware IDE Sidecar**: A simulated inline Monaco/VS Code environment (`IdeSidecar.tsx`) that allows learners to write code and solve node challenges directly in the browser. (See `docs/Feature_IDE_Sidecar.md`)
- **Offline-First Resilience UI**: A smart queueing system and animated banner (`OfflineSyncBanner.tsx`) that captures node completions when offline, syncing them seamlessly when reconnected. (See `docs/Feature_Offline_Resilience_UI.md`)
- **AI Coach "Help Me" Overlay**: A context-aware chat drawer (`AiCoachDrawer.tsx`) attached to learning nodes, offering socratic tutoring and assistance. (See `docs/Feature_AI_Coach.md`)
- **Gamification HUD & Micro-Celebration**: Floating dashboard widget (`GamificationHud.tsx`) tracking daily streaks and XP with micro-animations and full-screen celebrations (`MicroCelebration.tsx`). (See `docs/Feature_Gamification_HUD.md`, `docs/Feature_Micro_Celebration.md`)
- **Time-Travel History / Undo**: A snapshot state engine allowing users to instantly undo milestone completions via a sleek toast UI (`UndoToast.tsx`). (See `docs/Feature_Time_Travel.md`)
- **Command Palette**: Global keyboard-driven interface (`CommandPalette.tsx` via `Cmd/Ctrl+K`) for quickly triggering IDE (`Cmd+I`), AI Coach (`Cmd+H`), or Focus Mode (`Cmd+F`). (See `docs/Feature_Command_Palette.md`)
- **Focus Mode Toggle**: Cognitive-load reduction feature that uses CSS dimming and spotlighting on the active learning node. (See `docs/Feature_Focus_Mode.md`)
- **Shareable Proof Cards**: Verified competency credentials (`ProofCard.tsx`) displaying confidence scores, evidence tags, and AI narratives in a glassmorphic card. (See `docs/Feature_Proof_Cards.md`)
- **Learner-Steerable Autonomy Sliders**: Visual sliders (`AutonomySliders.tsx`, `RankingSliders.tsx`) allowing users to dynamically adjust speed vs. depth, free vs. paid, and video vs. project-based constraints. (See `docs/Feature_Ranking_Sliders.md`)
- **Skill Staleness & Ebbinghaus Decay Warning**: Proactive UI badges (`StalenessWarning.tsx`) that alert learners when a previously mastered skill requires a refresher.
- **Real-Time Job Opportunity Alerts**: Reactive notification cards (`OpportunityAlert.tsx`) triggered by market surges scraped by the background pipeline.
- **Job Data Collection & Scraping Pipeline (Backend)**: Asynchronous ETL pipeline (`apps/api/app/scraper/`) extracting live job postings from ATS platforms (e.g., Greenhouse), with HTML normalization, job-type classification, location/date formatting, and deduplication. (See `docs/Feature_Job_Scraping_Pipeline.md`)
- **Day-One Simulator Workspace**: A comprehensive corporate simulation environment featuring a live 5-column Kanban board, Slack-like chats with PM and Client personas, an in-browser IDE editor, and a code review system with inline feedback that automatically triggers BKT updates and path replans.
- **Platform Admin & Resource Curation Engine**: Secure role-based management panel protecting endpoints, curating resource CRUD submissions, auditing user/mentor status workflows, and checking real-time infra health pings. (See `docs/Feature_Platform_Admin.md`)
- **Fully Integrated Innovations**: All advanced core innovations—including SDT Debugging Diagnostics (keystroke telemetry), live What-If-Skip date-delta simulation, 2x2 Confidence-Competence Calibration Matrix, Career Alternatives Panel, and Roadmap Sanity Checker—are fully implemented across backend services and frontend components.
- **Full-Stack SaaS Integration**: True dynamic component wiring between the Next.js Zustand stores (via typed Axios hooks) and the FastAPI backend, eliminating hardcoded dummy arrays and ensuring a seamless, responsive production-grade user experience.
