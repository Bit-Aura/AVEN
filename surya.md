# Surya's Domain: Frontend, React Flow, & UX Innovations (Roadmap)

> **File Boundary Rule:** You strictly own `apps/web/`. **NEVER** edit files in `apps/api/`, `graph/`, or `packages/shared-types/` to prevent merge conflicts with Sriram. Consume shared types directly from `@aven/shared-types` or API responses.

---

## 1. Architectural Guardrails
- **Thin Client / Rich UX:** The client renders domain decisions computed by Sriram's backend engines. Do not duplicate graph planning algorithms or BKT math inside React components.
- **State Management:** Use Zustand (`usePathStore.ts`) for global graph/simulation state and TanStack Query / Next.js server actions for API interactions.

---

## 2. Your Innovation Task List (To Be Built)

### Task 1: IDE Keystroke & Diff Telemetry Hook (SDT Process-Praise UI)
- **Target File:** `apps/web/src/components/IdeSidecar.tsx` & `apps/web/src/components/AiCoachDrawer.tsx`
- **What to build:**
  - In `IdeSidecar.tsx`, record a snapshot whenever the user clicks **"Run Tests"**:
    `{ timestamp, codeDiff, linesChanged, testPassed, testOutput }`.
  - When tests pass, send the snapshot array to `POST /api/v1/diagnostics/debug-telemetry`.
  - In `AiCoachDrawer.tsx`, display the returned **Evidence-Based Process Praise card** (e.g. *"You isolated the bug in 3 surgical steps rather than random thrashing"*).
  - Stamp the earned **Debugging Mastery Badge** into `ProofCard.tsx`.

### Task 2: Live "What-If-Skip" Graph Simulation with Live Target Date Slider
- **Target File:** `apps/web/src/components/SkillGraph.tsx`, `apps/web/src/store/usePathStore.ts`, and `CurrentNodeCard.tsx`
- **What to build:**
  - In `SkillGraph.tsx`, when `isSimulatingSkip` is active:
    - Dim the skipped node with a cross-hatch pattern.
    - Style all blocked downstream nodes with an animated **pulsing amber border** and warning badge.
  - In `CurrentNodeCard.tsx`, render the **Interactive Date-Delta Simulator**:
    - Include a draggable **Weekly Study Budget Slider** (e.g., 5 to 20 hrs/week).
    - Call `/api/v1/simulate-skip-delta` to watch the projected readiness date shift live on screen (*"Oct 14 ──► Nov 04 (+21 days)"*).

### Task 3: Confidence–Competence 2x2 Calibration Modal
- **Target File:** `apps/web/src/components/assessment/CalibrationModal.tsx` & `MicroAssessmentModal.tsx`
- **What to build:**
  - Before starting a quiz, prompt the learner with a 1-click **Confidence Slider** (*"How confident are you on this topic? 0% to 100%"*).
  - Post-assessment, display a visual **2x2 Quadrant Chart**:
    - High Confidence + Low Score: **Blindspot Zone** (triggers counterexample review).
    - Low Confidence + High Score: **Imposter Zone** (triggers congratulatory confidence boost & Proof Card unlock).

### Task 4: Failure-Based Learning Map ("Mistake Heatmap")
- **Target File:** `apps/web/src/components/graph/FailureHeatmapOverlay.tsx`
- **What to build:**
  - A toggle button on the Skill Graph: *"Show Cognitive Heatmap"*.
  - Overlays visual color coding on skill nodes showing historical error frequency and recurrent mistake patterns (e.g. concurrency bugs, boundary conditions).

### Task 5: Dynamic Career Alternatives Side Drawer
- **Target File:** `apps/web/src/components/learner/CareerAlternativesDrawer.tsx` & `apps/web/src/app/(dashboard)/learner/page.tsx`
- **What to build:**
  - A floating drawer showing 3 alternative roles:
    - *MLOps Engineer:* 45% Ready (12 weeks away)
    - *Data Platform Engineer:* 82% Ready (**Fast-Track Recommendation: 2 weeks away**)
  - A 1-click *"Pivot to this Role"* button that re-renders the React Flow graph with the alternative path.

### Task 6: Placement Season War Room Dashboard & Mentor Triage Queue UI
- **Target File:** `apps/web/src/app/(dashboard)/learner/war-room/page.tsx` & `apps/web/src/app/(dashboard)/mentor/page.tsx`
- **What to build:**
  - **Learner View:** Weekly countdown sprint board synced to target company interview dates (Company A OA $\to$ Company B System Design).
  - **Mentor View:** Smart triage queue sorting students by high-impact opportunity windows (students who are 1 review away from passing drive benchmarks).

### Task 7: Roadmap Noise Sanity Checker UI
- **Target File:** `apps/web/src/components/learner/RoadmapNoiseChecker.tsx`
- **What to build:**
  - An input modal where learners paste external roadmap text or YouTube links.
  - Renders a color-coded analysis breakdown with badges:
    - 🟢 Aligned & High Market Demand
    - 🟡 Harmless Extra
    - 🔴 Potentially Misleading / Outdated

### Task 8: Identity-Aligned Onboarding Flow
- **Target File:** `apps/web/src/app/(onboarding)/identity/page.tsx`
- **What to build:**
  - 3-card archetype selector during onboarding (*"The Tool Builder"*, *"The Systems Architect"*, *"The Product Creator"*).
  - Stores identity in `usePathStore.ts` to customize copy across milestones and celebrations.

---

## 3. Developer Workflow & Anti-Conflict Protocol
1. Build UI components in `apps/web/src/components/` and test with Jest / React Testing Library (`npm test`).
2. Consume typed interfaces from Sriram's endpoints without modifying backend files.
3. Commit with descriptive messages (e.g., `feat(web): add live what-if-skip date delta slider and graph pulse`).
