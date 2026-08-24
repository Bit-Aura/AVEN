# Surya's Domain: Frontend, React Flow, & UX Innovations (Roadmap)

> **File Boundary Rule:** You strictly own `apps/web/`. **NEVER** edit files in `apps/api/`, `graph/`, or `packages/shared-types/` to prevent merge conflicts with Sriram. Consume shared types directly from `@aven/shared-types` or API responses.

---

## 1. Architectural Guardrails
- **Thin Client / Rich UX:** The client renders domain decisions computed by Sriram's backend engines. Do not duplicate graph planning algorithms or BKT math inside React components.
- **State Management:** Use Zustand (`usePathStore.ts`) for global graph/simulation state and TanStack Query / Next.js server actions for API interactions.

---

## 2. Your Innovation Task List — ALL COMPLETE ✅

### Task 1: IDE Keystroke & Diff Telemetry Hook (SDT Process-Praise UI) ✅
- **Files:** `apps/web/src/components/IdeSidecar.tsx` & `apps/web/src/components/AiCoachDrawer.tsx`
- **What was built:**
  - Integrated telemetry listener in `IdeSidecar.tsx` compiling keystroke and edit snapshots (`timestamp`, `codeDiff`, `linesChanged`, `testPassed`) upon clicking "Run Code".
  - Connected telemetry streams to `POST /api/v1/diagnostics/debug-telemetry`.
  - Configured `AiCoachDrawer.tsx` to render the returned **Evidence-Based Process Praise card** and display earned Debugging Mastery Badges.

### Task 2: Live "What-If-Skip" Graph Simulation with Live Target Date Slider ✅
- **Files:** `apps/web/src/components/SkillGraph.tsx`, `apps/web/src/store/usePathStore.ts`, and `apps/web/src/components/learner/CurrentNodeCard.tsx`
- **What was built:**
  - Implemented dynamic skip visualization on React Flow graph dimming bypassed nodes and pulsing dependent nodes in amber.
  - Interactive Date-Delta simulator in `CurrentNodeCard.tsx` with a draggable **Weekly Study Budget Slider** (5 to 20 hrs/week) that queries `/api/v1/simulate-skip-delta` to display real-time calendar date shifts.

### Task 3: Confidence–Competence 2x2 Calibration Modal ✅
- **Files:** `apps/web/src/components/assessment/CalibrationModal.tsx` & `apps/web/src/components/assessment/MicroAssessmentModal.tsx`
- **What was built:**
  - Pre-assessment confidence slider prompt (0% to 100%).
  - Interactive post-quiz 2x2 calibration matrix rendering quadrant classifications (CALIBRATED_MASTERY, BLINDSPOT, IMPOSTER_ZONE, CALIBRATED_NOVICE) with targeted triggers (counterexamples or confidence boosters).

### Task 4: Failure-Based Learning Map ("Mistake Heatmap") ✅
- **Files:** `apps/web/src/components/graph/FailureHeatmapOverlay.tsx`
- **What was built:**
  - Implemented a cognitive/mistake heatmap overlay toggle button on the Skill Graph.
  - Visual color-coding (red/orange gradients) overlaying skill nodes based on historical quiz/IDE errors and recurrent bugs (boundary conditions, concurrency, etc.).

### Task 5: Dynamic Career Alternatives Side Drawer ✅
- **Files:** `apps/web/src/components/learner/CareerAlternativesDrawer.tsx` & `apps/web/src/app/(dashboard)/learner/page.tsx`
- **What was built:**
  - Side drawer displaying adjacent roles with readiness scores mapped via active BKT states.
  - Highlighted "Fast-Track" career alternatives reachable sooner than target roles.
  - 1-click pivot action re-indexing target roles and re-rendering React Flow graphs.

### Task 6: Placement Season War Room Dashboard & Mentor Triage Queue UI ✅
- **Files:** `apps/web/src/app/(dashboard)/war-room/page.tsx` & `apps/web/src/app/(dashboard)/mentor/page.tsx`
- **What was built:**
  - **War Room Dashboard:** Week-by-week sprint boards synced to target company interview schedules with feasibility checks and gap skill checklists.
  - **Mentor Queue:** Smart triage board sorting learners by breakthrough zones (80-95% readiness index) to target final office-hour milestones.

### Task 7: Roadmap Noise Sanity Checker UI ✅
- **Files:** `apps/web/src/components/planner/RoadmapNoiseChecker.tsx`
- **What was built:**
  - Paste-in roadmap text parser connecting to the backend validator.
  - Rendered color-coded analysis labels (🟢 Aligned, 🟡 Harmless Extra, 🔴 Misleading) based on Greenhouse/Ashby demand weights.

### Task 8: Identity-Aligned Onboarding Flow ✅
- **Files:** `apps/web/src/app/(onboarding)/identity/page.tsx`
- **What was built:**
  - Calibration selectors capturing origin vs. destination identity archetypes.
  - Interactive sliders to tune speed, depth, and autonomous learning weights directly updated in the Zustand store.

### Task 9: Day-One Simulator Client Workspace (New Feature Added) ✅
- **Files:** `apps/web/src/app/(dashboard)/learner/simulator/page.tsx`
- **What was built:**
  - Built a comprehensive Day-One Simulator interface complete with a live 5-column Kanban ticket board (Backlog, To Do, In Progress, Under Review, Merged).
  - Integrated active task requirements spec boards and multi-channel Slack-like chat dialogs with PM and Client personas.
  - Built an in-browser IDE editor coupled with a PR review dashboard detailing compiler errors, automated test results, and inline code annotations.

---

## 3. Developer Workflow & Anti-Conflict Protocol
1. Build UI components in `apps/web/src/components/` and test with Jest / React Testing Library (`npm test`).
2. Consume typed interfaces from Sriram's endpoints without modifying backend files.
3. Commit with descriptive messages (e.g., `feat(web): add live what-if-skip date delta slider and graph pulse`).
