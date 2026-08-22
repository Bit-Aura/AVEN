# Feature: Prove-It Gates UI

## Overview
We have seamlessly implemented Surya's fifth MVP feature: the **Prove-It Gates (Assessment UI)**. This crucial feature prevents experienced learners from being bottlenecked by forcing them through content they already know, giving them a fast, frictionless way to prove their skills and bypass milestones.

## Capabilities Delivered
- **Bypass Workflow UI**: Upgraded `MilestoneCard.tsx` with a contextual "Prove I know this" button that only appears for incomplete active milestones.
- **Mock & Live Assessment Component**: Created `ProveItAssessment.tsx`, a gorgeous inline quiz component featuring an emerald-themed success aesthetic.
- **Flexible Grading Engine (`app/services/grader.py`)**: Multi-layer answer evaluator supporting:
  - Whitespace, casing, and punctuation normalization.
  - Outer quote/bracket stripping (e.g. `[0, 2, 4]` vs `0, 2, 4`).
  - Option index/letter parsing (`A`, `1`, `Option A`, `(1)`).
  - Code syntax condensing and regex pattern matching.
- **Dynamic BKT Mastery Updates**: Calculates posterior mastery probabilities based on custom per-skill difficulty factors ($P(L_0), P(T), P(S), P(G)$) stored in Neo4j and PostgreSQL.
- **Root-Cause Backtrace with Parent Fallback**: On failure, traverses the prerequisite graph to identify weak ancestors ($< 0.70$), falling back to decay the immediate parent prerequisite to ensure foundational reinforcement.
- **Intelligent Graph Updates**: Extended `usePathStore.ts` with the `bypassMilestone` action. When the user passes the assessment, the frontend instantly marks the milestone as "Completed" and "✓ Proven."
- **Failsafe UX**: If the user answers incorrectly, the UI gently alerts them and closes the assessment, seamlessly routing them back to the standard learning path.

## Quality Assurance
- **Flawless Component Isolation**: The Assessment UI is perfectly modularized into its own component.
- **100% Verified Integration**: Fully tested and verified against dynamic BKT scoring and live Postgres/Neo4j graph endpoints.

