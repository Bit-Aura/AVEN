# PathFinder — Full Project Context & Feature Specification

**Purpose of this document:** this is the single source of truth for what PathFinder is and what it does. Any agent or developer building this project should treat this file as the ground truth — do not invent features not listed here, do not rename mechanisms differently than they're named here, and do not assume a feature is "core" unless it's explicitly marked MVP.

---

## 1. One-Line Pitch

PathFinder is a learning-path system where an actual skill graph does the planning, a short conversation replaces the boring quiz, and the AI's only job is to explain and adapt — never to invent a prerequisite, a mastery level, or a fact that isn't backed by real data.

---

## 2. Non-Negotiable Architectural Principle

**AI interprets and explains. The deterministic domain engine decides.**

The LLM must **never** be the final authority on:
- Whether a prerequisite exists
- Whether a learner has mastered a skill
- Whether a resource is valid
- Whether a path is feasible within a time budget
- Whether a learner is "job-ready"
- Which database records get mutated

The LLM **may**:
- Parse a natural-language goal into a typed `GoalIntent`
- Conduct a bounded conversational diagnostic (from an approved question bank, not free generation)
- Explain a decision that was already made deterministically, using only facts supplied in a `DecisionTrace`
- Summarize feedback

Every AI output is schema-validated (Pydantic), provenance-linked, and passed through deterministic policy checks before it can affect anything real. This principle is the thing that makes every other claim in this document ("no hallucinated prerequisites," "confidence you can trust") actually true — it is not a slogan, it is an enforced code boundary.

---

## 3. Tech Stack (locked, do not substitute)

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + **React Flow** (skill graph rendering) + TanStack Query + Zustand + Drizzle ORM |
| Backend | FastAPI + Python 3.12 + Pydantic v2 + SQLAlchemy 2.0 async + Alembic + asyncpg |
| Transactional DB | PostgreSQL 16 + `pgvector` |
| Graph DB | **Neo4j** (real graph database — not a Postgres adjacency table) |
| Background/replanning | FastAPI `BackgroundTasks` + scheduled jobs (Temporal explicitly deferred, not used) |
| AI orchestration | One typed `AIProvider` interface (Protocol class) wrapping direct Anthropic SDK calls — never call the SDK from inside a service file directly |
| Auth | Clerk (Next.js middleware protection) |
| Deploy | Docker Compose locally → Railway (API/worker/Postgres) + Neo4j Aura |
| Observability | Structured JSON logging only (OpenTelemetry explicitly deferred) |

**Explicitly excluded from this build:** Temporal, OpenTelemetry/Prometheus, microservices split, a separate vector database (Pinecone/Weaviate/etc.), Neo4j Graph Data Science extensions, Kubernetes.

---

## 4. The Core Runtime Pipeline (baseline system — build this first)

This is the spine every other feature attaches to. Six steps, always in this order:

1. **Intent Parsing** — user's natural-language goal → LLM (JSON mode via `AIProvider.parse_goal`) → strict `GoalIntent` schema: `{target_goal, current_skills, time_budget, preferred_modality, constraints}`.
2. **Semantic Mapping** — the learner's loose wording (e.g. "SQL basics") is embedded and matched via `pgvector` cosine similarity against real skill graph node names, so it never has to match an exact string.
3. **Graph Traversal** — backend pulls the relevant subgraph from **Neo4j**, builds it in-memory with NetworkX, and runs a **topological sort** over unmet prerequisites. Deterministic. Zero hallucination by construction, because the output can only be nodes and edges that actually exist in the graph.
4. **Resource Retrieval & Ranking** — for the next skill in the sorted order, query PostgreSQL for matched resources and rank them against the learner's stated constraints (time budget, modality preference).
5. **Grounded Explanation** — the LLM (via `AIProvider.explain_decision`) is fed the goal, the sorted path, and the top resource, and generates plain-language "why" text. It is constrained to only reference facts in the `DecisionTrace` — it cannot introduce new claims.
6. **Dashboard Rendering** — the structured payload (active milestone, explanation, upcoming locked milestones) renders on the frontend via React Flow (graph) + milestone cards.

### The Adaptive Feedback Loop (baseline, not optional)
When a learner completes or fails a milestone, a webhook/event fires → the learner's skill-level estimate for that node updates in PostgreSQL → Step 4 (Ranking) re-runs for the next node with updated weighting → UI updates. Every replan produces a **new immutable `PathVersion`** (parent version, trigger event, changed nodes, decision trace, timestamp) — a path is never mutated in place. This is what makes the system auditable and demoable.

---

## 5. MVP Feature Set — build these fully, no shortcuts

These are the features that must exist, working, for the project to be considered functional at all.

- **Goal Chat** — natural-language goal capture.
- **Cold-Start Conversational Diagnostic** — a short, bounded conversation (question-bank driven, not open-ended LLM generation) figures out the learner's real starting skill level instead of a form or quiz. Solves the "brand-new learner with zero history" cold-start problem.
- **One role only for the demo** — Backend SWE or Data Analyst. Do not build multiple roles for MVP.
- **15–30 skills with real, curated prerequisites** in the Neo4j graph for that one role. Treat this graph as curated content, not throwaway seed data — every node needs a definition, difficulty level, and source.
- **Graph-highlighted learning path** — React Flow rendering of the skill map with the recommended route visibly lit up.
- **Why-This-Step explanation** — deterministic decision trace → LLM verbalizes it, per Step 5 above.
- **What-If-Skip simulation** — clicking "what if I skip this" re-runs traversal excluding that node, diffs the two paths, and the LLM explains the downstream consequence.
- **One Prove-It assessment per milestone** — see Innovation/Feature 5 below.
- **Fail event → root-cause repair → auto-replan** — see Feature 3 below.
- **Readiness Vector + Trust Panel** — see Feature 2 and Feature "Readiness Bar" below.
- **One rehearsed, deterministic, seeded golden demo scenario** (see Section 8).

---

## 6. Core Differentiator Features (the innovation layer — build after MVP pipeline works)

These are deduplicated and merged from all prior research passes. Each one names every alternate phrasing it appeared under across the research docs, so nothing gets rebuilt twice under a different name.

### Feature 1 — Skill Decay / Forgetting Curve
*(a.k.a. "The App Remembers That You Forget")*
A "mastered" skill node isn't a permanent flag. Attach a time-decay function (Ebbinghaus-style) to mastery, keyed to time-since-last-use. When estimated retention drops below a threshold, Step 3 (Graph Traversal) automatically re-inserts a short refresher milestone before letting the learner build further on that node.

### Feature 2 — Real Confidence Scoring (Bayesian Knowledge Tracing)
*(a.k.a. "A Confidence Score You Can Actually Trust," feeds the "Trust Panel" and "Readiness Bar")*
Each skill node carries a genuine posterior probability of mastery, computed from real interaction outcomes (prove-it check results), not a decorative percentage. This number is what's displayed anywhere "confidence" or "readiness" appears in the UI. **Caveat to state explicitly in the product and to judges:** this score is noisy for a brand-new user with little interaction history and improves as the learner interacts more — say this plainly, don't oversell day-one precision.

### Feature 3 — Failure Root-Cause Backtrace
*(a.k.a. "Finding the Real Reason You Got Stuck," "Failure-Based Learning Map")*
On a failure event, walk backward through the failed node's prerequisite edges and check each upstream node's confidence score (Feature 2). If an upstream node is marginal, that's flagged as the likely true root cause, and a refresher is inserted there — before re-serving anything at the node the learner actually failed on. Optionally logs a running "Failure Map" of the specific patterns a learner repeatedly struggles with, to target future micro-practice.

### Feature 4 — Time-Budget Reality Check
*(a.k.a. "An Honest Reality Check on Your Timeline," "Time-Budget Aware Planner")*
After Step 3 produces the shortest valid prerequisite chain, sum its realistic time cost and compare against the learner's stated time budget. If there's a genuine gap, don't silently shrink the plan — surface the conflict conversationally and let the learner choose (e.g. "shallow coverage of everything" vs. "deep coverage of less") before the path is finalized.

### Feature 5 — Prove-It Gates
*(a.k.a. "Prove It, Don't Just Click It")*
A skill node is never marked satisfied by a "Mark Complete" click. It requires passing a tiny auto-gradable artifact — a 2–3 question micro-quiz for conceptual nodes, or a short auto-tested code snippet for technical nodes. Passing is what updates the Feature 2 confidence score. This is the evidence every other trust-related feature is built on top of — build it early, it has no cold-start dependency.

### Feature 6 — Learner-Steerable Ranking Sliders
*(a.k.a. "You're in the Driver's Seat, Not the App")*
Expose the ranking model's actual trade-off dimensions (speed vs. depth, free vs. paid, video vs. project-based) as visible sliders on the dashboard. Moving a slider re-runs Step 4 live with new weights. No cold-start dependency — build early.

### Feature 7 — Market-Drift Reweighting / Job Market Ingestion Pipeline
*(a.k.a. "The App Stays Updated With the Real Job Market," "Opportunity Shock Alerts")*
An asynchronous job scraping ETL subsystem (`apps/api/app/scraper/`) extracts, cleans, validates, and deduplicates real-world job postings from external ATS platforms (e.g. Greenhouse public API). It normalizes HTML, classifies employment types, standardizes locations/dates, and powers market-demand signal tracking and skill prerequisite grounding. Accessible via CLI (`python -m app.scraper.cli`) and REST API (`POST /api/v1/scraper/scrape`, `GET /api/v1/scraper/sources`). See `docs/Feature_Job_Scraping_Pipeline.md`.


### Feature 8 — Multi-Agent Separation of Concerns
*(a.k.a. "One Brain for Listening, Another for Planning")*
This is not a new feature to build — it is **already satisfied by the architecture in Section 2 and the `AIProvider` interface**: one method parses intent, a separate deterministic engine plans the route, a separate method explains it. Confirm during build review that no single LLM call is doing more than one of these jobs at once.

### Feature 9 — Confidence–Competence Calibration
*(new, not previously covered elsewhere)*
Periodic checkpoints where the learner first self-rates their confidence on a topic, then takes a short diagnostic. The system compares perceived vs. actual performance and flags overconfidence (high self-rating, low performance) or underconfidence (low self-rating, high performance), and adjusts nudging accordingly.

### Feature 10 — Dynamic Career Alternatives Panel
*(merges "Role and alternative-role discovery" from the product-boundary doc with "Dynamic Career Alternatives Panel")*
Alongside the main path, continuously compute 2–3 adjacent roles that fit the learner's evolving skill profile, showing relative time-to-readiness and required deltas for each — a genuine trade-off view, not just the one committed path.

### Feature 11 — Readiness Bar (role-specific)
*(a.k.a. "Readiness Vector," merges with the Trust Panel)*
Replace generic "course progress" with a role-specific readiness percentage, computed and **shown as its components, not one opaque number**:
```
readiness(role) = weighted_skill_coverage × evidence_quality_factor × recency_factor × assessment_confidence
```
Must be labeled explicitly as a prototype readiness estimate — never as an employment guarantee or hiring probability.

### Feature 12 — Proof Cards
Compact, role-aligned evidence bundles combining skill tags, prove-it scores, project links, and an auto-generated narrative summary — the shareable "here's proof I actually know this" artifact.

---

## 7. Product-Feel / UX Rules (behavioral-psychology-derived — apply as constraints on how everything above is built, not as separate features)

These aren't extra components — they're rules the features above must follow:

- **Small, near-term subgoals, not one distant goal.** The topological sort output should be surfaced to the learner as a sequence of near-term steps, not a single distant "become X" target — this is what Step 3's output already naturally provides if the UI presents it correctly.
- **Every recommended resource is rejectable.** Rejecting a resource live re-runs Step 4 (Ranking) immediately — never silently falls back to a static "other options" list.
- **No shame on lapse.** On re-engagement after a gap, ask for the smallest possible next action, not a big catch-up session, and prefer waiting for a natural reset point (a Monday, a new month) over an immediate guilt-nudge.
- **Praise effort, not innate ability.** Milestone messages are copy-constrained to name the specific effort behind an achievement ("you fixed three build errors") — never trait-praise ("you're a natural"). Enforce this as a copywriting rule applied to every generated milestone message, not left to LLM discretion.
- **Minimal, high-contrast UI.** Bold type, stark borders, one focused layout — only the current step, its explanation, and what's next are visible at once. No decorative gradients, badges, or side-menu clutter competing for attention during active learning.
- **Explain, then show the consequence of disagreement.** Every recommendation ships with a plain-language reason, and if the learner pushes back, they see exactly how the path changes in response (ties directly to Feature 4's negotiation UI and the What-If-Skip simulation).

---

## 8. Golden Demo Scenario (script this exactly, rehearse it, use a seeded deterministic learner)

1. Learner says: *"I want to become a backend engineer in four months."*
2. Conversational diagnostic reveals confidence in Python, weakness in SQL joins and API design.
3. PathFinder displays the role graph and highlights the shortest valid route.
4. Learner asks *"What if I skip SQL?"* — graph shows downstream risk and explains the trade-off.
5. Learner fails an API-design checkpoint.
6. PathFinder identifies a missing upstream prerequisite (Feature 3), not merely the failed topic.
7. The route visibly re-plans on screen.
8. Learner passes the prove-it task (Feature 5).
9. Readiness updates (Feature 11), a skill becomes verified, a Proof Card is generated (Feature 12).
10. The Trust Panel shows exactly which evidence changed the result (Feature 2).

This single scenario is the one thing every component in Sections 4–6 must work correctly together to produce — treat it as the integration test, not just a demo script.

---

## 9. Completed Extensions & In-Progress Innovations
The following features and innovations are fully integrated into the codebase:
- **Keystroke & Diff Debugging Diagnostic (SDT Process-Praise)**: (`process_diagnostics.py`, `IdeSidecar.tsx`, `AiCoachDrawer.tsx`)
- **Live What-If-Skip Graph Simulation with Date-Delta**: (`skip_delta.py`, `SkillGraph.tsx`, `CurrentNodeCard.tsx`)
- **Confidence-Competence 2x2 Calibration Matrix**: (`calibration.py`, `CalibrationModal.tsx`, `MicroAssessmentModal.tsx`)
- **Prerequisite Root-Cause Failure Backtracer**: (`path_planner.py`, `CheckpointSubmitInput`)
- **Dynamic Career Alternatives & Pivot Panel**: (`career_engine.py`, `CareerAlternativesDrawer.tsx`)
- **Placement War Room Dashboard & Mentor Triage Queue**: (`placement_engine.py`, `war-room/page.tsx`, `mentor/page.tsx`)
- **Tutor Noise & Roadmap Sanity Filter**: (`noise_filter.py`, `RoadmapNoiseChecker.tsx`)
- **Day-One Simulator Workspace**: (`simulator.py`, `learner/simulator/page.tsx`, `KanbanBoard.tsx`, `MockPullRequest.tsx`, `StakeholderChat.tsx`)
- **Identity-Aligned Onboarding Flow**: (`identity/page.tsx`, `usePathStore.ts`)
- **Cohort Challenge Rings & Peer Presence**: (`CohortRing.tsx`, `PeerPresenceBadge.tsx`)
- **Staleness Warnings & Ebbinghaus Decay Worker**: (`StalenessWarning.tsx`, `decay_worker.py`)
- **Opportunity Alerts & ATS Job Ingestion (Greenhouse, Lever, Ashby, Google, Amazon)**: (`OpportunityAlert.tsx`, `apps/api/app/scraper/`)
- **Autonomy Sliders & Readiness Bar**: (`AutonomySliders.tsx`, `ReadinessBar.tsx`)
- **Micro-Assessment Gate Modals & Prove-It Gates**: (`MicroAssessmentModal.tsx`, `ProveItAssessment.tsx`)
- **Platform Admin & Resource Curation Engine**: (`admin.py`, `auth.py`, `admin/page.tsx`, `0003_admin_platform_system.py`, `Feature_Platform_Admin.md`)

---

## 10. Rule for Any Agent Building From This Document

If a feature request comes in, check the existing service implementations first to maintain strict architectural alignment with the deterministic neuro-symbolic domain engine.

