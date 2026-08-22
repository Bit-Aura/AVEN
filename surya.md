# PathFinder — Frontend & UX Tasks (Surya's Half)

This document contains your half of the work from `PathFinder_Full_Context.md`. To avoid merge conflicts with Sriram, you are strictly responsible for the **Frontend, UI, and UX** layers of the application (`apps/web/`).

## 1. Non-Negotiable Architectural Principle
**AI interprets and explains. The deterministic domain engine decides.**
- Your UI must render exactly what the backend API provides. Do not implement complex business logic, path finding, or skill mastery evaluations on the client side.

## 2. Tech Stack (Your Domain)
- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui 
- **Graph Visualization**: **React Flow** (skill graph rendering) 
- **State Management**: TanStack Query + Zustand
- **Auth**: Clerk

## 3. The Core Runtime Pipeline (Your Tasks)
- **Dashboard Rendering**: Build the React Flow graph rendering and milestone cards to consume the structured payload (active milestone, explanation, upcoming locked milestones).
- **The Adaptive Feedback Loop**: Ensure UI optimistically updates or refetches when webhooks/events alter the learner's path (e.g. producing a new `PathVersion`).

## 4. MVP Feature Set (Your Tasks)
- **Goal Chat UI**: Build the interface for natural-language goal capture.
- **Cold-Start Conversational Diagnostic UI**: Build the chat UI for the bounded diagnostic.
- **Graph-highlighted learning path**: Use React Flow to render the skill map with the recommended route visibly lit up.
- **Why-This-Step explanation**: UI for displaying the LLM's explanation of the current step.
- **What-If-Skip simulation UI**: UI controls (e.g., "what if I skip this" button) that fetch the diffed path and display downstream consequences.
- **One Prove-It assessment**: Build the UI to display and submit a 2-3 question micro-quiz or short code snippet.
- **Trust Panel & Readiness Vector**: Build the UI components to display the Readiness Vector and Trust Panel cleanly.

## 5. Core Differentiator Features (Your Tasks)
- **Feature 1 (Skill Decay UI)**: Render "refresher" milestones cleanly when they are inserted.
- **Feature 2 (Real Confidence Scoring UI)**: Display confidence percentages appropriately (e.g., not as a decorative percentage, but a real metric with an explicit caveat about day-one precision).
- **Feature 3 (Failure Root-Cause Backtrace UI)**: Visualize when an upstream node is flagged as the root cause, and display the "Failure Map".
- **Feature 4 (Time-Budget Reality Check UI)**: Build the negotiation UI (e.g. "shallow coverage of everything" vs. "deep coverage of less") when the backend flags a time gap.
- **Feature 5 (Prove-It Gates UI)**: Block "Mark Complete" clicks; require the micro-quiz UI to be passed instead.
- **Feature 6 (Learner-Steerable Ranking Sliders)**: Build visible sliders (speed vs. depth, free vs. paid, video vs. project-based) that re-fetch Step 4 live.
- **Feature 7 (Opportunity Shock Alerts UI)**: Build notifications for learners when market demand shifts.
- **Feature 9 (Confidence–Competence Calibration UI)**: UI for periodic self-rating checkpoints.
- **Feature 10 (Dynamic Career Alternatives Panel)**: Build a side panel showing 2-3 adjacent roles and relative time-to-readiness.
- **Feature 11 (Readiness Bar)**: Render the role-specific readiness percentage and explicitly break it down into its components (coverage, quality, recency, confidence).
- **Feature 12 (Proof Cards)**: Build the shareable UI cards combining skill tags, prove-it scores, project links, and narratives.

## 6. Product-Feel / UX Rules (Apply to all features)
- **Small, near-term subgoals**: Present the graph as a sequence of near-term steps, not a single distant target.
- **Rejectable resources**: Every recommended resource needs a "reject" button that triggers a live re-fetch.
- **No shame on lapse**: Ask for the smallest next action on re-engagement; no guilt-nudges.
- **Praise effort, not innate ability**: Ensure the UI accommodates backend messages praising effort.
- **Minimal, high-contrast UI**: Bold type, stark borders, focused layout. Only the current step, its explanation, and next steps are visible. No decorative gradients or clutter.
- **Explain, then show consequence**: Use the What-If-Skip simulation UI extensively when users disagree.

## 7. Golden Demo Scenario Integration
Ensure the UI perfectly choreographs the 10-step Golden Demo Scenario described in the master context.

**Note on Exclusions**: Do NOT build anything listed in Section 9 of the master document.

## 7. Developer Workflow & Quality Rules (See agents.md)
1. **Code Quality**: Write clean, modular, maintainable code with small inline comments.
2. **Sequential, Test-Driven Delivery**: Build one feature at a time. Write tests for it and verify it perfectly before moving to the next.
3. **Documentation**: Create positive, praising, and honest documentation for each new feature. Update the main README.md as features are completed.
4. **Clean Test Environments**: Auto-delete benchmark/temp test files. Do not commit test artifacts to the repo.
5. **Frequent & Meaningful Commits**: Commit often with meaningful messages as you make logical progress; do not wait until the end of a feature to commit.
