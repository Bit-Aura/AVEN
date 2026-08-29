# Assessment and Calibration (Prove-It Gates)

## Overview
The Assessment and Calibration subsystem (internally known as Prove-It Gates) provides a frictionless, enterprise-grade evaluation engine. It enables experienced learners to bypass elementary content by demonstrating mastery through dynamic technical assessments, preventing bottlenecking and ensuring optimal learning velocity.

## Architecture
This subsystem integrates a React-based interactive assessment environment with a secure backend evaluation engine. It leverages Bayesian Knowledge Tracing (BKT) to dynamically update learner mastery profiles in real-time within the knowledge graph.

## Flow Diagram
```mermaid
flowchart TD
    A[Learner Views Milestone] --> B{Already Mastered?}
    B -- Yes --> C[Skip Content]
    B -- No --> D[Trigger Assessment]
    D --> E[Submit Solution (Code/Quiz)]
    E --> F[Backend Evaluation Engine]
    F --> G{Passed?}
    G -- Yes --> H[Update BKT Graph & Mark Proven]
    G -- No --> I[Trigger Prerequisite Backtrace & Decay]
```

Or in text form:
1. A learner engages with a learning milestone.
2. If the milestone is not mastered, the learner can opt to trigger the Prove-It assessment.
3. The learner submits a solution via the interactive IDE or multiple-choice interface.
4. The submission is evaluated securely by the backend grading engine.
5. On success, the Knowledge Graph updates the learner's posterior mastery probabilities and marks the node as proven.
6. On failure, the system performs a root-cause backtrace to decay prerequisite nodes, seamlessly redirecting the user to foundational content.

## Key Components
- **`ProveItAssessment.tsx`**: A robust, brutalist-styled inline quiz and mini-IDE component. Features syntax highlighting, isolated container simulation, and an immersive evaluation aesthetic.
- **`api/assessment/submit/route.ts`**: The secure API endpoint that processes assessment submissions, evaluates logic, and interfaces with the BKT mastery engine.
- **`MicroAssessmentModal.tsx`**: A focused modal wrapper that presents the assessment environment without disrupting the user's primary workflow context.

## Data and Configuration
The evaluation engine relies on per-skill difficulty factors ($P(L_0), P(T), P(S), P(G)$) stored securely in Neo4j and PostgreSQL. Configuration requires stable database connections for real-time BKT probability updates.

## Integration Points
- **Knowledge Graph**: Deep integration with Neo4j to trace prerequisite hierarchies and decay graph edges dynamically upon failure.
- **Pathfinder Store (`usePathStore.ts`)**: State management integration ensuring the frontend instantly reflects BKT updates, allowing instantaneous bypass of proven milestones.

## Usage Notes
Invoked seamlessly from the `MilestoneCard` when an active milestone is pending completion. Requires an active session and is optimized for low-latency feedback.
