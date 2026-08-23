# Career PathFinder

An AI-powered personalized learning path recommender where a deterministic skill graph does the planning, a short diagnostic conversation replaces standard quizzes, and the AI explains decisions based strictly on ground-truth data.

## Monorepo Architecture

This project is organized as a monorepo containing:
- **Backend (`apps/api`)**: FastAPI application, async SQLAlchemy 2.0, PostgreSQL 16 with `pgvector`, official `neo4j` driver, NetworkX for graph traversal, and direct Anthropic SDK calls wrapped in a typed `AIProvider` gateway.
- **Frontend (`apps/web`)**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + React Flow (`@xyflow/react`) for skill-graph prerequisite map visualization, TanStack Query, and Zustand.
- **Shared Types (`packages/shared-types`)**: OpenAPI-generated TypeScript types shared across the stack to keep API schemas and client models synchronized.
- **Graph (`graph/`)**: Cypher scripts defining uniqueness constraints and schemas for skill graph nodes and prerequisite relationships.
- **Scripts (`scripts/`)**: Automated type-generation pipelines.

---

## Technical Stack & Infrastructure

- **Transactional DB**: PostgreSQL 16 + `pgvector`
- **Graph DB**: Neo4j Community Edition 5.20.0
- **AI Gateway**: Protocol-based integration of Anthropic SDK (with a functional mock provider for tests)
- **Visualization**: React Flow (xyflow) for interactive directed acyclic graphs (DAGs)

---

## Core Runtime Pipeline

1. **Intent Parsing**: User natural-language goal $\rightarrow$ validated `GoalIntent` (Pydantic schema).
2. **Semantic Mapping**: Embed and match user-input skills to database nodes using `pgvector` cosine similarity.
3. **Graph Traversal**: Retrieve subgraphs from Neo4j, build in NetworkX, and perform a deterministic topological sort of unmet prerequisites.
4. **Resource Retrieval & Ranking**: Match resources against constraints (time budget, modality) and rank them.
5. **Grounded Explanation**: Generate natural language reasons explaining recommendations using a strict `DecisionTrace` (no hallucination).
6. **Dashboard Rendering**: Present path milestones in the frontend with React Flow.

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
- **Next.js Frontend**: `http://localhost:8080`
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

## Built Features
- **Dashboard & Skill Graph (Frontend)**: Highly interactive, visually stunning React Flow graph for displaying the learning path, powered by strict Zustand state management and fully testable architecture. (See docs/Feature_Dashboard_Skill_Graph.md)
- **Goal Chat UI (Frontend)**: An immersive, beautifully styled natural-language input interface that seamlessly captures the user's initial goal and conditionally transitions into the dashboard. (See docs/Feature_Goal_Chat.md)
- **Cold-Start Diagnostic UI (Frontend)**: A sleek, bounded conversational UI that effectively estimates a learner's baseline skills right after onboarding, preventing the "cold-start" problem without relying on boring forms. (See docs/Feature_Diagnostic_Chat.md)
- **What-If-Skip Simulation UI (Frontend)**: Empowers learners to negotiate their path by previewing the downstream consequences of skipping a milestone, complete with immersive visual graph feedback and inline consequence rendering. (See docs/Feature_What_If_Skip.md)
- **Prove-It Assessment UI (Frontend)**: A seamlessly integrated quiz interface that allows confident learners to instantly prove their skills and bypass foundational milestones without unnecessary friction. (See docs/Feature_Prove_It_Gates.md)
- **Trust Panel & Readiness Vector UI (Frontend)**: Eliminates the "black box" by showing the learner exactly why the AI generated their path, visualizing their progress toward their ultimate goal. (See docs/Feature_Trust_Panel.md)
- **Live Multi-Cursor/Presence UI (Frontend)**: A sleek collaboration bar showing who else is viewing the path right now (e.g., mentors, peers). (See docs/Feature_Presence_UI.md)
- **Context-Aware IDE Sidecar (Frontend)**: A simulated inline Monaco/VS Code environment that allows learners to write code and solve node challenges directly in the browser without friction. (See docs/Feature_IDE_Sidecar.md)
- **Offline-First Resilience UI (Frontend)**: A smart queueing system and animated banner that captures node completions when offline, syncing them seamlessly when the connection returns. (See docs/Feature_Offline_Resilience_UI.md)
- **AI Coach "Help Me" Overlay (Frontend)**: A context-aware chat drawer attached to learning nodes, offering socratic tutoring and assistance. (See docs/Feature_AI_Coach.md)
- **Gamification HUD (Frontend)**: A floating dashboard widget tracking daily streaks and XP with micro-animations that fire when completing milestones. (See docs/Feature_Gamification_HUD.md)
- **Micro-celebration Overlay (Frontend)**: A screen-covering, dopamine-inducing animation that triggers automatically when a user completes a major learning milestone. (See docs/Feature_Micro_Celebration.md)
- **Time-Travel History / Undo (Frontend)**: A custom snapshot state engine allowing users to instantly undo milestone completions via a sleek toast UI. (See docs/Feature_Time_Travel.md)
- **Command Palette (Frontend)**: A global keyboard-driven interface (Cmd/Ctrl+K) for quickly accessing power features like the IDE (Cmd+I) or AI Coach (Cmd+H). (See docs/Feature_Command_Palette.md)
- **Focus Mode Toggle (Frontend)**: A cognitive-load reduction feature that uses CSS dimming and blurring to spotlight only the active learning node, accessible via a header toggle or Cmd+F. (See docs/Feature_Focus_Mode.md)
- **Shareable Proof Cards (Frontend)**: The capstone UI feature displaying a learner's verified confidence score, evidence tags, and an AI narrative in a premium, shareable glassmorphic credential. (See docs/Feature_Proof_Cards.md)
- **Learner-Steerable Ranking Sliders**: Visual sliders allowing users to dynamically adjust speed vs. depth, free vs. paid, and video vs. project-based constraints. (See docs/Feature_Ranking_Sliders.md)
- **Job Data Collection & Scraping Pipeline (Backend)**: Asynchronous, source-agnostic ETL pipeline extracting live job postings from ATS platforms (e.g., Greenhouse), with HTML normalization, job-type classification, location/date formatting, and deduplication. (See docs/Feature_Job_Scraping_Pipeline.md)
- **E2E Testing & Component Validation Pipeline**: Complete Jest + React Testing Library coverage for all 17 UI components, coupled with a full Playwright End-to-End suite (`golden_flow.spec.ts`) tracing the user journey from goal submission to checkpoint evaluation.
- **Resilient AI & Database Fallbacks**: Advanced failover architecture that gracefully handles external LLM outages (e.g., Anthropic API limits) and offline Docker database topologies (Neo4j/Postgres) using intercepting mock drivers and simulated generation subgraphs to ensure zero-downtime execution.
- **Full-Stack SaaS Integration**: True dynamic component wiring between the Next.js Zustand stores (via typed Axios hooks) and the FastAPI backend, eliminating hardcoded dummy arrays and ensuring a seamless, responsive production-grade user experience.
