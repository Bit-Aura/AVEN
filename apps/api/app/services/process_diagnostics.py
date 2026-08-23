"""
Process Diagnostics Service — Keystroke & Diff Debugging Diagnostic Engine.

Implements the SDT (Self-Determination Theory) Evidence-Based Process-Praise system.
Instead of generic effort-praise, this service analyzes a learner's actual debugging
telemetry (diffs, test outcomes, edit oscillation) to classify their strategy and
generate mathematically grounded, evidence-based process-praise.

Key Algorithm: Thrash Index T_i
  T_i = (oscillating_edits_on_unrelated_lines / total_chars_changed) * (1 - test_run_frequency)

  - T_i < 0.2  → BINARY_SEARCH_ISOLATION   (best: targeted, systematic)
  - 0.2–0.45   → HYPOTHESIS_DRIVEN          (good: structured hypotheses)
  - 0.45–0.65  → EXPLORATORY                (moderate: some structure)
  - T_i > 0.65 → RANDOM_THRASHING           (needs coaching)
"""
import logging
import re
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.infrastructure.ai.gateway import AIProvider

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic Input/Output Schemas
# ---------------------------------------------------------------------------

class DebugSnapshot(BaseModel):
    """A single moment-in-time snapshot of the learner's IDE state during a debug session."""
    timestamp: float = Field(..., description="Unix epoch timestamp of this snapshot.")
    diff: str = Field(..., description="Unified diff text of code changes since last snapshot.")
    lines_changed: List[int] = Field(
        default_factory=list,
        description="List of source line numbers that were modified in this snapshot."
    )
    test_ran: bool = Field(default=False, description="Did the learner run tests after this edit?")
    test_passed: bool = Field(default=False, description="Did at least one test pass?")
    failed_test_names: List[str] = Field(
        default_factory=list,
        description="Names of test functions that failed."
    )
    execution_output: Optional[str] = Field(
        default=None,
        description="Raw stdout/stderr from the test run, if any."
    )


class DebuggingTelemetryInput(BaseModel):
    """Full telemetry payload submitted by the frontend IDE after a coding challenge."""
    milestone_id: str = Field(..., description="The skill/milestone node ID being practiced.")
    snapshots: List[DebugSnapshot] = Field(
        ...,
        min_length=1,
        description="Ordered list of IDE snapshots during the debug session."
    )


class CompetencyDelta(BaseModel):
    """Specific, evidence-backed competency score changes from this debug session."""
    systematic_debugging: int = Field(default=0, description="Delta for Root-Cause Isolation skill.")
    test_driven_development: int = Field(default=0, description="Delta for TDD practice score.")
    code_precision: int = Field(default=0, description="Delta for edit precision and minimal change.")


class DebuggingDiagnosticReport(BaseModel):
    """The full structured report returned to the frontend after analyzing a debug session."""
    milestone_id: str
    strategy: str  # BINARY_SEARCH_ISOLATION | HYPOTHESIS_DRIVEN | EXPLORATORY | RANDOM_THRASHING
    thrash_index: float = Field(ge=0.0, le=1.0)
    steps_to_first_pass: int = Field(
        description="Number of test runs before at least one test passed."
    )
    total_snapshots: int
    total_test_runs: int
    process_praise: str = Field(
        description="Evidence-based, specific process-praise text for display in the AI Coach Drawer."
    )
    competency_deltas: CompetencyDelta
    coaching_note: Optional[str] = Field(
        default=None,
        description="Coaching nudge shown when the strategy is suboptimal."
    )


# ---------------------------------------------------------------------------
# Core Metric Computation
# ---------------------------------------------------------------------------

def _count_diff_chars(diff_text: str) -> int:
    """Count total added/removed characters in a unified diff, ignoring metadata lines."""
    total = 0
    for line in diff_text.splitlines():
        if line.startswith(("+", "-")) and not line.startswith(("+++", "---")):
            total += len(line) - 1  # subtract the leading +/-
    return max(total, 0)


def _is_oscillating_edit(snapshot: DebugSnapshot, prev_failed_lines: set) -> int:
    """
    Count characters changed on lines that were NOT part of a failing test's
    reported frame (i.e., the learner is editing unrelated code instead of
    the confirmed failure point).

    Since we don't have actual AST frames in the browser, we use a heuristic:
    if prev_failed_lines is non-empty and none of snapshot.lines_changed
    intersect it, the edit is classified as oscillating.
    """
    if not prev_failed_lines or not snapshot.lines_changed:
        return 0

    changed_set = set(snapshot.lines_changed)
    if changed_set.isdisjoint(prev_failed_lines):
        # Entire edit is away from known failure area → oscillating
        return _count_diff_chars(snapshot.diff)
    return 0


def compute_thrash_index(snapshots: List[DebugSnapshot]) -> float:
    """
    Computes the Thrash Index T_i across the whole debug session.

    T_i = (sum_oscillating_chars / total_chars_changed) * (1 - test_run_frequency)

    test_run_frequency = snapshots_with_test_runs / total_snapshots

    Returns a value in [0.0, 1.0]. Higher = more thrashing.
    """
    if not snapshots:
        return 0.0

    total_chars = sum(_count_diff_chars(s.diff) for s in snapshots)
    if total_chars == 0:
        return 0.0

    # Build a rolling set of "known failure lines" from test output parsing.
    # We use the line numbers from the PREVIOUS snapshot's failed test output
    # as heuristic failure anchors.
    prev_failed_lines: set = set()
    total_oscillating = 0

    for snap in snapshots:
        total_oscillating += _is_oscillating_edit(snap, prev_failed_lines)

        # Update prev_failed_lines from this snapshot's execution output
        if snap.test_ran and snap.execution_output:
            # Regex to extract line numbers from Python tracebacks: "line 42"
            found = re.findall(r"line\s+(\d+)", snap.execution_output, re.IGNORECASE)
            if found:
                prev_failed_lines = {int(ln) for ln in found}
            elif not snap.test_passed:
                # No extractable lines; carry over the existing set
                pass
            else:
                prev_failed_lines = set()  # Tests passed; reset

    test_run_frequency = sum(1 for s in snapshots if s.test_ran) / len(snapshots)
    raw_ti = (total_oscillating / total_chars) * (1.0 - test_run_frequency)
    return round(min(1.0, max(0.0, raw_ti)), 4)


def classify_strategy(ti: float) -> str:
    """Maps Thrash Index to a strategy label."""
    if ti < 0.20:
        return "BINARY_SEARCH_ISOLATION"
    elif ti < 0.45:
        return "HYPOTHESIS_DRIVEN"
    elif ti < 0.65:
        return "EXPLORATORY"
    else:
        return "RANDOM_THRASHING"


def compute_steps_to_first_pass(snapshots: List[DebugSnapshot]) -> int:
    """Return the number of snapshots (edits) before the first test pass. -1 if never passed."""
    for i, snap in enumerate(snapshots):
        if snap.test_ran and snap.test_passed:
            return i + 1
    return len(snapshots)


# ---------------------------------------------------------------------------
# Evidence-Based Praise Generation (deterministic, no LLM hallucination)
# ---------------------------------------------------------------------------

def _build_process_praise(
    strategy: str,
    ti: float,
    steps: int,
    total_test_runs: int,
    milestone_id: str,
) -> str:
    """
    Builds a deterministic, evidence-grounded process-praise string.
    Unlike generic LLM praise, every sentence references a concrete metric from the session.
    """
    skill_display = milestone_id.replace("_", " ").title()

    if strategy == "BINARY_SEARCH_ISOLATION":
        return (
            f"Outstanding debugging process on **{skill_display}**. "
            f"You localized the fault in **{steps} targeted test run{'s' if steps != 1 else ''}**, "
            f"keeping your edits focused on the confirmed failure zone (Thrash Index: {ti:.2f}). "
            f"This binary-search isolation technique is exactly how senior engineers debug production systems."
        )
    elif strategy == "HYPOTHESIS_DRIVEN":
        return (
            f"Strong systematic approach on **{skill_display}**. "
            f"You formed clear hypotheses and validated them across {total_test_runs} test run{'s' if total_test_runs != 1 else ''} "
            f"before arriving at a fix (Thrash Index: {ti:.2f}). "
            f"Your edits stayed mostly near the identified problem area — that discipline reduces time-to-fix significantly."
        )
    elif strategy == "EXPLORATORY":
        return (
            f"Good effort on **{skill_display}** — you ran tests regularly ({total_test_runs} run{'s' if total_test_runs != 1 else ''}), "
            f"which is the right instinct. "
            f"Some edits (Thrash Index: {ti:.2f}) drifted from the confirmed failure lines. "
            f"Next time, try writing a print assertion *at* the failing line first before editing elsewhere."
        )
    else:  # RANDOM_THRASHING
        return (
            f"You put in real effort on **{skill_display}** across {len(range(steps))} edit cycles. "
            f"The session data shows a Thrash Index of {ti:.2f}, meaning many edits landed outside "
            f"the confirmed failure zone. "
            f"The pro move: write one targeted assertion to pin the exact line that fails, then fix only that."
        )


def _compute_competency_deltas(strategy: str, ti: float) -> CompetencyDelta:
    """
    Computes verifiable competency delta scores based on measured session metrics.
    These are intentionally modest, calibrated scores — not gamification inflation.
    """
    if strategy == "BINARY_SEARCH_ISOLATION":
        return CompetencyDelta(systematic_debugging=15, test_driven_development=10, code_precision=12)
    elif strategy == "HYPOTHESIS_DRIVEN":
        return CompetencyDelta(systematic_debugging=10, test_driven_development=8, code_precision=7)
    elif strategy == "EXPLORATORY":
        return CompetencyDelta(systematic_debugging=5, test_driven_development=6, code_precision=3)
    else:
        return CompetencyDelta(systematic_debugging=2, test_driven_development=4, code_precision=0)


def _build_coaching_note(strategy: str) -> Optional[str]:
    """Returns a targeted coaching note for suboptimal strategies. None if strategy is good."""
    if strategy == "BINARY_SEARCH_ISOLATION":
        return None
    elif strategy == "HYPOTHESIS_DRIVEN":
        return None
    elif strategy == "EXPLORATORY":
        return (
            "Tip: Before your next edit, write one line — a print or assertion — that proves "
            "EXACTLY where the value goes wrong. Only then change code."
        )
    else:
        return (
            "Try the 'bisect' method: comment out half the suspected code, run tests, "
            "see if the failure moves. This halves your search space on every step."
        )


# ---------------------------------------------------------------------------
# Public Entry Point
# ---------------------------------------------------------------------------

async def analyze_debug_session(
    payload: DebuggingTelemetryInput,
    ai_provider: Optional[AIProvider] = None,
) -> DebuggingDiagnosticReport:
    """
    Main entry point. Accepts a telemetry payload and returns a structured
    DebuggingDiagnosticReport with evidence-based process-praise.

    The ai_provider is accepted for signature compatibility but the core
    classification is fully deterministic — no LLM is required or used
    for the primary analysis. The principle: 'AI explains, the data decides.'
    """
    snaps = payload.snapshots

    ti = compute_thrash_index(snaps)
    strategy = classify_strategy(ti)
    steps = compute_steps_to_first_pass(snaps)
    total_test_runs = sum(1 for s in snaps if s.test_ran)
    praise = _build_process_praise(strategy, ti, steps, total_test_runs, payload.milestone_id)
    deltas = _compute_competency_deltas(strategy, ti)
    coaching = _build_coaching_note(strategy)

    logger.info(
        f"[ProcessDiagnostics] milestone={payload.milestone_id} "
        f"strategy={strategy} ti={ti} steps={steps} runs={total_test_runs}"
    )

    return DebuggingDiagnosticReport(
        milestone_id=payload.milestone_id,
        strategy=strategy,
        thrash_index=ti,
        steps_to_first_pass=steps,
        total_snapshots=len(snaps),
        total_test_runs=total_test_runs,
        process_praise=praise,
        competency_deltas=deltas,
        coaching_note=coaching,
    )
