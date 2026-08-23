# Sriram's Domain: Backend, AI Engines, & Graph Algorithms (Roadmap)

> **File Boundary Rule:** You strictly own `apps/api/`, `graph/`, and `packages/shared-types/`. **NEVER** edit files in `apps/web/` to prevent merge conflicts with Surya.

---

## 1. Architectural Guardrails
- **The Deterministic Domain Principle:** AI interprets and explains; deterministic Python domain engines (Neo4j, NetworkX, BKT math) decide.
- **Contract-First Delivery:** Always define Pydantic schemas first, test endpoints with `pytest`, and run `./scripts/generate-types.sh` so Surya gets clean TypeScript definitions in `packages/shared-types`.

---

## 2. Your Innovation Task List (To Be Built)

### Task 1: Keystroke & Diff Debugging Diagnostic Engine (SDT Process-Praise)
- **Target File:** `apps/api/app/services/process_diagnostics.py` & `apps/api/app/main.py`
- **What to build:**
  - Endpoint `POST /api/v1/diagnostics/debug-telemetry` accepting snapshot sequences: `{ timestamp, diff, lines_changed, test_ran, test_passed }`.
  - Algorithm to compute **Thrash Index ($T_i$)**:
    $$T_i = \left(\frac{\text{Oscillating edits on non-failing lines}}{\text{Total characters changed}}\right) \times (1 - \text{TestRunFrequency})$$
  - Classify strategy: `BINARY_SEARCH_ISOLATION` ($T_i < 0.2$), `HYPOTHESIS_DRIVEN`, or `RANDOM_THRASHING` ($T_i > 0.65$).
  - Generate structured, evidence-based process-praise payload via `AIProvider`.

### Task 2: Live What-If-Skip Downstream & Date-Delta Engine
- **Target File:** `apps/api/app/services/path_planner.py` & `apps/api/app/main.py`
- **What to build:**
  - Endpoint `POST /api/v1/simulate-skip-delta` accepting `{ profile_id, skipped_skill_id, weekly_hours }`.
  - Traverse Neo4j / NetworkX DAG to compute `descendants(skipped_skill_id)`.
  - Calculate friction hours penalty and project the calendar date shift:
    $$\Delta \text{Days} = \left(\frac{\text{Path Hours} - \text{Hours}(S) + \text{FrictionHours}(S)}{\text{Weekly Hours}}\right) \times 7\text{ days}$$
  - Return `{ blocked_node_ids: [...], friction_hours: 12, original_date: "2026-10-14", new_date: "2026-11-04", delta_days: 21 }`.

### Task 3: Confidence–Competence 2x2 Calibration Evaluator
- **Target File:** `apps/api/app/services/calibration.py` & `apps/api/app/main.py`
- **What to build:**
  - Endpoint `POST /api/v1/calibration/evaluate` taking `{ self_rated_confidence: 0.85, actual_score: 0.30 }`.
  - Classify into 4 quadrants: `BLINDSPOT` (Overconfident), `IMPOSTER_ZONE` (Underconfident), `CALIBRATED_MASTERY`, `CALIBRATED_NOVICE`.
  - Return tailored pedagogical actions (e.g. inject counterexamples vs. trigger Proof Card generation).

### Task 4: Prerequisite Root-Cause Failure Backtracer
- **Target File:** `apps/api/app/services/path_planner.py`
- **What to build:**
  - Logic in the grading loop: if a learner fails a checkpoint twice, walk backwards up the Neo4j DAG through `[:DEPENDS_ON]` edges.
  - Locate the lowest-confidence ancestor node ($P(L) < 0.60$) and insert a mini-refresher node directly into the active path.

### Task 5: Dynamic Career Alternatives Parallel Vector Evaluator
- **Target File:** `apps/api/app/services/career_engine.py` & `apps/api/app/main.py`
- **What to build:**
  - Endpoint `GET /api/v1/career/alternatives/{profile_id}`.
  - Compare the learner's current `ReadinessSnapshot` vector against 3 role clusters in PostgreSQL using `pgvector`.
  - Return readiness % and estimated time-to-completion for adjacent high-demand roles.

### Task 6: Placement Season War Room & Mentor Triage Queue Engine
- **Target File:** `apps/api/app/services/placement_engine.py` & `apps/api/app/main.py`
- **What to build:**
  - Ingest company hiring drive schedules and reverse-engineer sprint schedules for high-frequency patterns.
  - Triage queue scoring algorithm prioritizing learners within the 90th percentile breakthrough threshold.

### Task 7: Tutor Noise & Roadmap Sanity Filter
- **Target File:** `apps/api/app/services/noise_filter.py` & `apps/api/app/main.py`
- **What to build:**
  - Endpoint `POST /api/v1/roadmap/sanity-check` accepting external roadmap text/links.
  - Extract skills via LLM $\to$ map against Neo4j skill graph $\to$ classify each recommendation as `ALIGNED`, `HARMLESS_EXTRA`, or `MISLEADING`.

---

## 3. Developer Workflow & Anti-Conflict Protocol
1. Build one service and endpoint at a time in `apps/api/app/services/`.
2. Write unit tests in `apps/api/tests/` and verify (`pytest apps/api`).
3. Run `./scripts/generate-types.sh` to update `packages/shared-types/index.d.ts`.
4. Commit with descriptive messages (e.g., `feat(api): add what-if-skip date delta calculation endpoint`).
