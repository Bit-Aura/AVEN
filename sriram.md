# Sriram's Domain: Backend, AI Engines, & Graph Algorithms

> **File Boundary Rule:** You strictly own `apps/api/`, `graph/`, and `packages/shared-types/`. **NEVER** edit files in `apps/web/` to prevent merge conflicts with Surya.

---

## 1. Architectural Guardrails
- **The Deterministic Domain Principle:** AI interprets and explains; deterministic Python domain engines (Neo4j, NetworkX, BKT math) decide.
- **Contract-First Delivery:** Pydantic schemas defined first → endpoint tested → `./scripts/generate-types.sh` run so Surya gets clean TypeScript definitions.

---

## 2. Innovation Task Status — ALL COMPLETE ✅

### Task 1: Keystroke & Diff Debugging Diagnostic Engine (SDT Process-Praise) ✅
- **File:** `apps/api/app/services/process_diagnostics.py`
- **Endpoint:** `POST /api/v1/diagnostics/debug-telemetry`
- **What was built:**
  - `DebuggingTelemetryInput` schema accepting snapshot sequences: `{ timestamp, diff, lines_changed, test_ran, test_passed, failed_test_names, execution_output }`.
  - `compute_thrash_index()` — pure mathematical Thrash Index: $T_i = (\text{oscillating\_chars} / \text{total\_chars}) \times (1 - \text{TestRunFrequency})$
  - `classify_strategy()` — maps $T_i$ to `BINARY_SEARCH_ISOLATION | HYPOTHESIS_DRIVEN | EXPLORATORY | RANDOM_THRASHING`.
  - `_build_process_praise()` — deterministic, evidence-grounded praise referencing real session metrics (steps, test runs, T_i).
  - `_compute_competency_deltas()` — calibrated `CompetencyDelta` (Systematic Debugging, TDD, Code Precision).
  - Zero LLM calls for classification — fully deterministic. AI may explain but the data decides.

### Task 2: Live What-If-Skip Downstream & Date-Delta Engine ✅
- **File:** `apps/api/app/services/skip_delta.py`
- **Endpoint:** `POST /api/v1/simulate-skip-delta`
- **What was built:**
  - `SkipDeltaInput` accepting `{ profile_id, skipped_skill_id, weekly_study_hours }`.
  - Full Neo4j → NetworkX DAG load and `nx.descendants()` traversal for blocked nodes.
  - `FRICTION_MULTIPLIER = 1.5` applied per blocked descendant (learning without prerequisite takes 50% longer).
  - `_project_date()` converts hours to calendar date using exact weekly budget arithmetic.
  - Returns `blocked_nodes[]` (with per-node depth, hours, friction), `delta_days`, `original_target_date`, `new_target_date`, human-readable `verdict`, and `is_recommended_to_skip`.

### Task 3: Confidence–Competence 2x2 Calibration Evaluator ✅
- **File:** `apps/api/app/services/calibration.py`
- **Endpoint:** `POST /api/v1/calibration/evaluate`
- **What was built:**
  - `_classify_quadrant()` — pure function classifying into `CALIBRATED_MASTERY | BLINDSPOT | IMPOSTER_ZONE | CALIBRATED_NOVICE` using threshold of 0.65.
  - `_build_explanation()` — data-grounded explanation referencing exact self-rated and actual percentages.
  - `_build_pedagogical_action()` — concrete actions: counterexample injection, Proof Card unlock, encouragement.
  - Fully deterministic: zero LLM calls.

### Task 4: Prerequisite Root-Cause Failure Backtracer ✅
- **File:** `apps/api/app/services/path_planner.py` (existing `failure_root_cause_backtrace()`)
- **Status:** Was already fully implemented with Neo4j ancestor walk + PostgreSQL readiness comparison + direct-parent fallback.
- Confirmed working and wired to `POST /api/v1/checkpoint/submit`.

### Task 5: Dynamic Career Alternatives Parallel Vector Evaluator ✅
- **File:** `apps/api/app/services/career_engine.py`
- **Endpoint:** `GET /api/v1/career/alternatives/{profile_id}`
- **What was built:**
  - 5 role clusters defined: `backend_swe`, `data_engineer`, `devops_platform`, `mlops_engineer`, `fullstack_swe` with priority-ordered skill lists and market demand scores.
  - Geometric decay weighting: `weight_i = 1/(i+1)` so foundational skills matter more.
  - Fast-track detection: flags roles reachable sooner than the learner's current target role.
  - Sorting: Fast-track → Readiness descending → Market demand.

### Task 6: Placement Season War Room & Mentor Triage Queue Engine ✅
- **File:** `apps/api/app/services/placement_engine.py`
- **Endpoints:**
  - `POST /api/v1/placement/plan` — week-by-week sprint planner
  - `POST /api/v1/placement/triage` — mentor triage queue
- **What was built:**
  - Curated company profiles for Microsoft, Amazon, Google, Stripe, and generic startup.
  - Sprint distributor: allocates gap skills across available weeks with final crunch-review week.
  - Feasibility check: flags if weekly study budget is insufficient and recommends minimum hrs/week.
  - Triage formula: `score = readiness * (1 + urgency_factor) * proximity_bonus` where `proximity_bonus = 1.5` for breakthrough-zone learners.

### Task 7: Tutor Noise & Roadmap Sanity Filter ✅
- **File:** `apps/api/app/services/noise_filter.py`
- **Endpoint:** `POST /api/v1/roadmap/sanity-check`
- **What was built:**
  - Skill alias map: 35+ synonyms/aliases → canonical skill IDs.
  - Known misleading keywords list (SOAP, XML-RPC, etc.) flagged automatically.
  - Market demand threshold classification: ≥80% → ALIGNED, 55-80% → HARMLESS_EXTRA, <55% or out-of-graph → MISLEADING.
  - Overall rating: `TRUSTWORTHY | MOSTLY_OK | REVIEW_CAREFULLY | MISLEADING` based on mislead ratio.
  - Neo4j fallback to static set if graph unavailable.

### Task 8: Day-One Simulator Engine ✅
- **File:** `apps/api/app/services/simulator.py`
- **Endpoints:**
  - `GET /api/v1/simulator/tickets/{profile_id}`
  - `POST /api/v1/simulator/ticket/{ticket_id}/chat`
  - `POST /api/v1/simulator/ticket/{ticket_id}/submit-pr`
- **What was built:**
  - Dynamic Kanban Board builder fetching and mapping tickets based on user's active BKT graph/roadmap.
  - Conversational AI stakeholder client/PM roleplaying engine utilizing Anthropic SDK.
  - Dynamic Senior Developer code reviewer checking code submissions for edge cases and styling.
  - Automated PR approval trigger updating BKT skill mastery, executing graph path replanning, and updating the cryptographic Proof Card and narratives (via xAPI telemetry logs).

---

## 3. API Endpoint Registry (All Innovation Endpoints in main.py)

| Method | Endpoint | Service File | Innovation |
|--------|----------|-------------|------------|
| POST | `/api/v1/diagnostics/debug-telemetry` | `process_diagnostics.py` | SDT Debugging Diagnostic |
| POST | `/api/v1/simulate-skip-delta` | `skip_delta.py` | Live Skip Date Simulation |
| POST | `/api/v1/calibration/evaluate` | `calibration.py` | 2x2 Calibration Matrix |
| GET | `/api/v1/career/alternatives/{id}` | `career_engine.py` | Career Alternatives Panel |
| POST | `/api/v1/placement/plan` | `placement_engine.py` | Sprint Planner |
| POST | `/api/v1/placement/triage` | `placement_engine.py` | Mentor Triage Queue |
| POST | `/api/v1/roadmap/sanity-check` | `noise_filter.py` | Roadmap Sanity Filter |
| GET | `/api/v1/simulator/tickets/{profile_id}` | `simulator.py` | Day-One Simulator Tickets |
| POST | `/api/v1/simulator/ticket/{ticket_id}/chat` | `simulator.py` | Stakeholder Persona Chat |
| POST | `/api/v1/simulator/ticket/{ticket_id}/submit-pr` | `simulator.py` | PR Review & Approval |

---

## 4. Developer Workflow & Anti-Conflict Protocol
1. Surya consumes all endpoints above from `apps/web/` without touching backend files.
2. After any schema change: run `./scripts/generate-types.sh` and commit updated `packages/shared-types/index.d.ts`.
3. All new files validated with `python -c "import ast; ast.parse(open(f).read())"` — zero syntax errors confirmed.
