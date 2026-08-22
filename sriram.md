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
- Computes cosine similarity in Python against all Neo4j skill names & descriptions using `numpy` and returns matches above a $0.30$ similarity score threshold.

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

## 5. MVP & Differentiator Features Built

### Feature 1: Skill Decay (Forgetting Curve)
- Implements Ebbinghaus forgetting curve math: $R = e^{-t / S}$ where $S$ (stability) is 30 days and $t$ is the elapsed days since last updated.
- Automatically decays mastery scores. If they drop below the $0.60$ mastery threshold, the graph traversal dynamically re-inserts the skill as an active refresher.

### Feature 2: Bayesian Knowledge Tracing (BKT)
- Standard BKT update formulas:
  - If Correct: $P(L_{t-1} \mid Correct) = \frac{P(L_{t-1}) (1 - P(S))}{P(L_{t-1}) (1 - P(S)) + (1 - P(L_{t-1})) P(G)}$
  - If Incorrect: $P(L_{t-1} \mid Incorrect) = \frac{P(L_{t-1}) P(S)}{P(L_{t-1}) P(S) + (1 - P(L_{t-1})) (1 - P(G))}$
  - Transition: $P(L_t) = P(L_{t-1} \mid Result) + (1 - P(L_{t-1} \mid Result)) P(T)$
- Configured parameters: Prior $P(L_0) = 0.15$, Transition $P(T) = 0.20$, Slip $P(S) = 0.10$, Guess $P(G) = 0.20$.

### Feature 3: Failure Root-Cause Backtrace
- On failure, recursively traverses backward through Neo4j prerequisites.
- Identifies and flags the weakest prerequisite in Postgres (readiness $< 0.70$) as the root cause, forcing its decay to trigger an upstream refresher path.

### Feature 4: Time-Budget Reality Check
- Compares topological path length time requirements against the budget and flags time limit discrepancies.

### Feature 5: Prove-It Gates & Assessment Checkpoints
- Compares responses against correct answers from PostgreSQL. Success updates BKT confidence; failure triggers root-cause backtrace.

### Feature 11: Dynamic Readiness Bar
- Formulates role-readiness using:
  $$readiness(role) = weighted\_skill\_coverage \times evidence\_quality\_factor \times recency\_factor \times assessment\_confidence$$

### Feature 12: Proof Cards
- Generates evidence bundles containing role details, verification dates, mastered skill counts, and narrative summaries.

---

## 6. Completed REST API Endpoint Routes (`app/main.py`)

| Endpoint | Method | Input Schema | Description |
|---|---|---|---|
| `/health` | GET | None | Health check & active adapter status |
| `/api/v1/seed` | POST | None | Idempotent database & graph seeder |
| `/api/v1/goal` | POST | `GoalInput` | Submits goal, parses intent, and starts diagnostic |
| `/api/v1/diagnostic/submit` | POST | `DiagnosticSubmitInput` | Submits answers and checks if ready to plan path |
| `/api/v1/path/{profile_id}` | GET | None | Retrieves latest generated learning path |
| `/api/v1/path/skip` | POST | `SkipSimulationInput` | Diff paths without target skill & returns LLM consequence |
| `/api/v1/checkpoint/submit` | POST | `CheckpointSubmitInput` | Submits Prove-It quiz and updates BKT score |
| `/api/v1/weights/update` | POST | `SliderWeightsInput` | Updates slider weights and re-ranks path resources |
| `/api/v1/readiness/{profile_id}`| GET | None | Dynamic readiness stats and Proof Card generation |

---

## 7. Verification & Type Gen
- **Unit Tests**: All unit tests (`pytest`) are passing: `3 passed in 1.19s`.
- **TypeScript Generation**: Autogenerated type definitions created at `packages/shared-types/index.d.ts` successfully match the full schema definitions.
