# Sriram's Domain: Backend, AI, and Database (COMPLETED)

This document tracks the completed tasks, schemas, and mathematical specifications implemented for the **Backend, AI, and Database** layers of **PathFinder**. All code resides in `apps/api/`, `graph/`, and `packages/shared-types/`.

---

## 1. Architectural Integrity (Enforced)
- **Deterministic Domain Engine Principle**: Enforced strictly by separating state machine computations (traversals, BKT, decay, and score calculations) in python from natural language parsing. The LLM only parses intents, asks diagnostic questions from context, or explains the trace.
- **Pydantic Validation**: All endpoints and AI responses utilize Pydantic schemas (e.g. `GoalIntent`, `DiagnosticQuestion`).

---

## 2. Completed Technology Stack Setup
- **FastAPI Backend**: Configured routing, middleware, and dependency injection.
- **Transactional Database**: PostgreSQL 16 + `pgvector` async connection via SQLAlchemy 2.0.
- **Graph Database**: Async execution wrapper using the official Neo4j driver.
- **AI Gateway**: `AIProvider` Protocol with `AnthropicAdapter` (Claude 3.5 Sonnet) and `MockAIProvider` for local testing.

**Note on Exclusions**: Do NOT build anything listed in Section 9 of the master document (e.g., crypto, multi-agent RL loops, cohort rings).

---

## 3. Developer Workflow & Quality Rules
1. **Code Quality**: Write clean, modular, maintainable code with small inline comments.
2. **Sequential, Test-Driven Delivery**: Build one feature at a time. Write tests for it and verify it perfectly before moving to the next.
3. **Documentation**: Create positive, praising, and honest documentation for each new feature. Update the main README.md as features are completed.
4. **Clean Test Environments**: Auto-delete benchmark/temp test files. Do not commit test artifacts to the repo.
5. **Frequent & Meaningful Commits**: Commit often with meaningful messages as you make logical progress; do not wait until the end of a feature to commit.

---

## 4. Core Runtime Pipeline Implementation Details

### Step 1: Intent Parsing (`app/services/intent_parser.py`)
- Delegates natural language objectives to `AIProvider.parse_goal` using structured JSON schema instructions to return a validated `GoalIntent`.

### Step 2: Semantic Mapping (`app/services/semantic_mapper.py`)
- Employs the `all-MiniLM-L6-v2` SentenceTransformer to generate a 384-dimensional dense embedding of user intent.
- Pre-computes and stores 384-dim vector embeddings directly in the PostgreSQL `skills` table during seeding.
- Queries PostgreSQL using `pgvector` indexed cosine distance (`<=>`), eliminating in-memory Python calculations for instant, scalable semantic matching.

### Step 3: Graph Traversal (`app/services/graph_engine.py` & `app/services/path_planner.py`)
- Queries Neo4j for target skills and all their recursive ancestor prerequisite connections (`:PREREQUISITE_OF`).
- Builds a directed subgraph in-memory using `NetworkX`.
- Performs a deterministic `topological_sort` to arrange prerequisite skills in correct sequential order.
- Skips mastered skills (Postgres readiness score $\ge 0.70$).

### Step 4: Resource Retrieval & Ranking (`app/services/ranker.py`)
- Queries Postgres for resources matching `skill_id`. Performs a `pgvector` cosine similarity search fallback if no direct skill match is present.
- Applies user-steerable slider weights (`speed`, `depth`, `cost`) to rank video, text, or project resources.

### Step 5: Grounded Explanation (`app/services/explainer.py`)
- Generates 1-3 sentence explanations using Claude. The prompt is strictly grounded in the `DecisionTrace` to prevent hallucinations.

### Step 6: Adaptive Feedback Loop (`app/services/path_planner.py`)
- Auto-updates estimated mastery upon completions or failures, re-runs ranking, and registers a new immutable `PathVersion` record.

---

## 5. Completed Differentiator Features (100% Implemented)

### Feature 1: Skill Decay (Forgetting Curve) & Active Worker
- Implements Ebbinghaus forgetting curve math: $R = e^{-t / S}$ where $S$ (stability) is 30 days and $t$ is the elapsed days since last updated.
- Automatically decays mastery scores during path replanning, plus an active background worker (`app/workers/decay_worker.py`) and dedicated trigger endpoint `POST /api/v1/readiness/decay` to actively update forgetting curves across all learner profiles.

### Feature 2: Dynamic Bayesian Knowledge Tracing (BKT)
- Standard BKT update formulas evaluated using **custom per-skill difficulty parameters** stored on Neo4j nodes and PostgreSQL `skills` table:
  - If Correct: $P(L_{t-1} \mid Correct) = \frac{P(L_{t-1}) (1 - P(S))}{P(L_{t-1}) (1 - P(S)) + (1 - P(L_{t-1})) P(G)}$
  - If Incorrect: $P(L_{t-1} \mid Incorrect) = \frac{P(L_{t-1}) P(S)}{P(L_{t-1}) P(S) + (1 - P(L_{t-1})) (1 - P(G))}$
  - Transition: $P(L_t) = P(L_{t-1} \mid Result) + (1 - P(L_{t-1} \mid Result)) P(T)$
- Configured dynamic parameters per skill difficulty (e.g. `python_basics`: Prior 0.25, Transition 0.30, Slip 0.08, Guess 0.25; `system_design`: Prior 0.08, Transition 0.15, Slip 0.15, Guess 0.12).

### Feature 3: Failure Root-Cause Backtrace with Parent Fallback
- On failure, recursively traverses backward through Neo4j prerequisites to find weak ancestral skills ($< 0.70$).
- **Direct Parent Fallback**: If all ancestors are technically above $\ge 0.70$, it automatically falls back to decay the immediate direct prerequisite parent with the lowest score, ensuring learners receive targeted fundamentals reinforcement.

### Feature 4: Time-Budget Reality Check (Actual Resource Durations)
- Queries and sums the actual `duration_minutes` metadata from top-ranked resources across all remaining milestones.
- Formulates realistic study timeline projections (estimated hours, estimated study weeks at 10h/week pace) and flags realistic time budget discrepancies.

### Feature 5: Prove-It Gates Flexible Grading
- Multi-layer flexible assessment evaluator (`app/services/grader.py`) supporting:
  - Whitespace, casing, and punctuation normalization.
  - Outer quote/bracket stripping (e.g. `[0, 2, 4]` vs `0, 2, 4`).
  - Option index/letter parsing (`A`, `1`, `Option A`, `(1)`).
  - Code syntax condensing and regex pattern matching.

### Feature 11: Dynamic Readiness Bar with Graph Centrality Weighting
- Formulates role-readiness using NetworkX PageRank and descendant dependency centrality to weight foundational skills heavier than leaf skills:
  $$readiness(role) = weighted\_skill\_coverage \times evidence\_quality\_factor \times recency\_factor \times assessment\_confidence$$

### Feature 12: Cryptographically Signed Proof Cards & Exportable SVG Badges
- Generates tamper-proof credentials signed via **HMAC-SHA256** with unique IDs and verification metadata.
- Includes dynamic SVG certificate badge generation (`GET /api/v1/proof-card/{profile_id}/svg`) and cryptographic verification endpoint (`POST /api/v1/proof-card/verify`).

---

## 6. Completed REST API Endpoint Routes (`app/main.py`)

| Endpoint | Method | Input Schema | Description |
|---|---|---|---|
| `/health` | GET | None | Health check & active adapter status |
| `/api/v1/seed` | POST | None | Idempotent database & graph seeder with pgvector & BKT properties |
| `/api/v1/goal` | POST | `GoalInput` | Submits goal, parses intent, and starts diagnostic |
| `/api/v1/diagnostic/submit` | POST | `DiagnosticSubmitInput` | Submits answers and checks if ready to plan path |
| `/api/v1/path/{profile_id}` | GET | None | Retrieves latest generated learning path |
| `/api/v1/path/skip` | POST | `SkipSimulationInput` | Diff paths without target skill & returns LLM consequence |
| `/api/v1/checkpoint/submit` | POST | `CheckpointSubmitInput` | Submits Prove-It quiz with flexible grading & dynamic BKT |
| `/api/v1/weights/update` | POST | `SliderWeightsInput` | Updates slider weights and re-ranks path resources |
| `/api/v1/readiness/{profile_id}`| GET | None | Centrality-weighted dynamic readiness & signed proof card |
| `/api/v1/readiness/decay` | POST | None | Actively triggers Ebbinghaus forgetting curve decay across profiles |
| `/api/v1/proof-card/{profile_id}` | GET | None | Retrieves cryptographically signed HMAC-SHA256 Proof Card |
| `/api/v1/proof-card/{profile_id}/svg` | GET | None | Exports dynamic, styled SVG badge certificate |
| `/api/v1/proof-card/verify` | POST | `Dict` | Cryptographically verifies authenticity of a submitted proof card |

---

## 7. Verification & Type Gen
- **End-to-End Verification Suite**: All 8 upgraded features verified passing with 100% score via `scripts/verify_features.py`.
- **TypeScript Generation**: Autogenerated type definitions created at `packages/shared-types/index.d.ts` successfully match the full schema definitions.

