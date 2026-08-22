# PathFinder — Backend & AI Tasks (Sriram's Half)

This document contains your half of the work from `PathFinder_Full_Context.md`. To avoid merge conflicts with Surya, you are strictly responsible for the **Backend, AI, and Database** layers of the application (`apps/api/`, graph/db scripts).

## 1. Non-Negotiable Architectural Principle
**AI interprets and explains. The deterministic domain engine decides.**
- The LLM must **never** be the final authority on prerequisites, mastery, resources, feasibility, readiness, or DB mutations.
- Every AI output must be schema-validated (Pydantic), provenance-linked, and passed through deterministic policy checks.

## 2. Tech Stack (Your Domain)
- **Backend**: FastAPI + Python 3.12 + Pydantic v2 + SQLAlchemy 2.0 async + Alembic + asyncpg
- **Transactional DB**: PostgreSQL 16 + `pgvector`
- **Graph DB**: Neo4j (real graph database)
- **Background/replanning**: FastAPI `BackgroundTasks` + scheduled jobs
- **AI orchestration**: One typed `AIProvider` interface (Protocol class) wrapping direct Anthropic SDK calls.

## 3. The Core Runtime Pipeline (Your Tasks)
1. **Intent Parsing**: Build the LLM (JSON mode via `AIProvider.parse_goal`) to parse natural language to a strict `GoalIntent` schema.
2. **Semantic Mapping**: Implement `pgvector` cosine similarity against real skill graph node names.
3. **Graph Traversal**: Build the Neo4j query logic, NetworkX in-memory representation, and topological sort over unmet prerequisites.
4. **Resource Retrieval & Ranking**: Query Postgres for resources and rank them against constraints.
5. **Grounded Explanation**: Implement `AIProvider.explain_decision` using the decision trace.
6. **The Adaptive Feedback Loop**: Build the webhook/event handlers to update skill-level estimates, re-run ranking, and produce new immutable `PathVersion` records.

## 4. MVP Feature Set (Your Tasks)
- **Goal Chat**: Backend endpoints for natural-language goal capture.
- **Cold-Start Conversational Diagnostic**: Backend logic/prompting (from question bank) to determine starting skill level.
- **Seed Data**: Insert 15–30 skills with curated prerequisites into the Neo4j graph for the single role (Backend SWE or Data Analyst).
- **Why-This-Step explanation**: Deterministic decision trace generation for the LLM.
- **What-If-Skip simulation**: Backend logic to re-run traversal excluding a node, diffing paths, and explaining consequences.
- **One Prove-It assessment**: Backend logic to score auto-gradable artifacts.
- **Fail event → auto-replan**: Trigger replanning and root-cause repair logic.

## 5. Core Differentiator Features (Your Tasks)
- **Feature 1 (Skill Decay)**: Implement time-decay function (Ebbinghaus-style) on mastery to trigger refresher milestones.
- **Feature 2 (Bayesian Knowledge Tracing)**: Implement real posterior probability math for confidence scoring.
- **Feature 3 (Failure Root-Cause Backtrace)**: Graph traversal logic to check upstream confidence scores and flag root causes.
- **Feature 4 (Time-Budget Reality Check)**: Logic to sum topological sort time cost and compare to the budget.
- **Feature 5 (Prove-It Gates)**: Backend scoring for micro-quizzes or code snippets.
- **Feature 6 (Learner-Steerable Ranking Sliders)**: Backend support to accept weights and re-run Step 4 ranking.
- **Feature 7 (Market-Drift Reweighting)**: Scaffold offline job logic (if no external data, leave disabled).
- **Feature 8 (Multi-Agent Separation)**: Enforce the `AIProvider` interface separation.
- **Feature 9 (Confidence–Competence Calibration)**: Logic to compare self-rating vs. actual performance.
- **Feature 10 (Dynamic Career Alternatives Panel)**: Logic to compute 2-3 adjacent roles and time-to-readiness.
- **Feature 11 (Readiness Bar)**: Calculate `readiness(role) = weighted_skill_coverage × evidence_quality_factor × recency_factor × assessment_confidence`.
- **Feature 12 (Proof Cards)**: Data generation for evidence bundles.

## 6. Golden Demo Scenario Integration
Ensure all backend API endpoints and data structures seamlessly support the 10-step Golden Demo Scenario described in the master context.

**Note on Exclusions**: Do NOT build anything listed in Section 9 of the master document (e.g., crypto, multi-agent RL loops, cohort rings).

## 7. Developer Workflow & Quality Rules (See agents.md)
1. **Code Quality**: Write clean, modular, maintainable code with small inline comments.
2. **Sequential, Test-Driven Delivery**: Build one feature at a time. Write tests for it and verify it perfectly before moving to the next.
3. **Documentation**: Create positive, praising, and honest documentation for each new feature. Update the main README.md as features are completed.
