"""
Calibration Service — Confidence–Competence 2x2 Matrix Evaluator.

Implements a pre/post-assessment calibration check that detects:
  - Dunning-Kruger Effect (overconfidence): High self-rating + Low actual score.
  - Imposter Syndrome (underconfidence): Low self-rating + High actual score.
  - Calibrated Mastery: High self-rating + High actual score.
  - Calibrated Novice: Low self-rating + Low actual score.

The system outputs a calibration quadrant classification and tailored
pedagogical actions — deterministically, without LLM hallucination.

Thresholds (configurable):
  HIGH confidence/score threshold: >= 0.65
  LOW confidence/score threshold: < 0.65
"""
import logging
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, AliasChoices

logger = logging.getLogger(__name__)

# Boundary between "high" and "low" confidence/score
CALIBRATION_THRESHOLD = 0.65


# ---------------------------------------------------------------------------
# Enums and Schemas
# ---------------------------------------------------------------------------

class CalibrationQuadrant(str, Enum):
    """The four quadrants of the Confidence–Competence 2x2 Matrix."""
    CALIBRATED_MASTERY = "CALIBRATED_MASTERY"       # High self, High score
    BLINDSPOT = "BLINDSPOT"                           # High self, Low score  (Dunning-Kruger)
    IMPOSTER_ZONE = "IMPOSTER_ZONE"                  # Low self, High score  (Imposter Syndrome)
    CALIBRATED_NOVICE = "CALIBRATED_NOVICE"          # Low self, Low score


class CalibrationInput(BaseModel):
    """Request payload: the learner's pre-quiz self-rating and post-quiz actual score."""
    profile_id: int = Field(..., description="ID of the learner profile.")
    skill_id: str = Field(..., description="The skill/milestone being calibrated.")
    self_rated_confidence: float = Field(
        ..., ge=0.0, le=1.0,
        validation_alias=AliasChoices("self_rated_confidence", "confidence_pre_assessment"),
        description="Learner's self-rated mastery probability (0.0–1.0) collected before the quiz."
    )
    actual_score: float = Field(
        ..., ge=0.0, le=1.0,
        description="Actual quiz/assessment score (0.0–1.0) from the BKT grader."
    )


class PedagogicalAction(BaseModel):
    """A concrete action the system should take as a result of the calibration quadrant."""
    action_type: str   # INJECT_COUNTEREXAMPLE | GENERATE_PROOF_CARD | GENTLE_CONFIRMATION | ENCOURAGEMENT
    display_message: str
    unlock_proof_card: bool = False
    inject_counterexample: bool = False
    confidence_nudge: Optional[str] = None


class CalibrationReport(BaseModel):
    """Full calibration report returned to the frontend."""
    profile_id: int
    skill_id: str
    self_rated_confidence: float
    actual_score: float
    calibration_gap: float  # actual_score - self_rated_confidence (signed)
    quadrant: CalibrationQuadrant
    quadrant_label: str
    explanation: str
    pedagogical_action: PedagogicalAction


# ---------------------------------------------------------------------------
# Quadrant Logic
# ---------------------------------------------------------------------------

def _classify_quadrant(self_confidence: float, actual_score: float) -> CalibrationQuadrant:
    """Pure function: classifies into one of four quadrants based on threshold."""
    high_self = self_confidence >= CALIBRATION_THRESHOLD
    high_score = actual_score >= CALIBRATION_THRESHOLD

    if high_self and high_score:
        return CalibrationQuadrant.CALIBRATED_MASTERY
    elif high_self and not high_score:
        return CalibrationQuadrant.BLINDSPOT
    elif not high_self and high_score:
        return CalibrationQuadrant.IMPOSTER_ZONE
    else:
        return CalibrationQuadrant.CALIBRATED_NOVICE


def _get_quadrant_label(quadrant: CalibrationQuadrant) -> str:
    labels = {
        CalibrationQuadrant.CALIBRATED_MASTERY: "Calibrated Mastery ✅",
        CalibrationQuadrant.BLINDSPOT: "Blind Spot Zone ⚠️",
        CalibrationQuadrant.IMPOSTER_ZONE: "Imposter Zone 🚀",
        CalibrationQuadrant.CALIBRATED_NOVICE: "Calibrated Beginner 📚",
    }
    return labels[quadrant]


def _build_explanation(
    quadrant: CalibrationQuadrant,
    skill_id: str,
    self_conf: float,
    actual: float,
) -> str:
    """Generates a data-grounded explanation specific to the learner's numbers."""
    skill_display = skill_id.replace("_", " ").title()
    self_pct = int(self_conf * 100)
    actual_pct = int(actual * 100)

    if quadrant == CalibrationQuadrant.CALIBRATED_MASTERY:
        return (
            f"Your self-assessment ({self_pct}%) closely matches your actual performance ({actual_pct}%) "
            f"on **{skill_display}**. Your internal model of your own knowledge is accurate — "
            f"a rare and valuable metacognitive skill."
        )
    elif quadrant == CalibrationQuadrant.BLINDSPOT:
        gap = self_pct - actual_pct
        return (
            f"You rated your confidence at {self_pct}%, but your actual performance was {actual_pct}% "
            f"on **{skill_display}** (a {gap}pt gap). "
            f"This is the Dunning-Kruger zone: the knowledge gap you have is partially invisible to you. "
            f"This is completely normal and fixable — the system will surface the specific edge cases you missed."
        )
    elif quadrant == CalibrationQuadrant.IMPOSTER_ZONE:
        gap = actual_pct - self_pct
        return (
            f"You rated yourself at only {self_pct}%, but you actually scored {actual_pct}% "
            f"on **{skill_display}** (a {gap}pt gap). "
            f"Your competence exceeds your self-perception — a classic sign of Imposter Syndrome. "
            f"The data shows you know this. Your Proof Card for this skill is now unlocked."
        )
    else:
        return (
            f"Your self-assessment ({self_pct}%) and actual performance ({actual_pct}%) both reflect "
            f"that **{skill_display}** is still in early development — and that's perfectly expected. "
            f"Accurate self-awareness at this stage is itself a strength."
        )


def _build_pedagogical_action(
    quadrant: CalibrationQuadrant,
    skill_id: str,
    actual_score: float,
) -> PedagogicalAction:
    """Derives a concrete pedagogical action for each calibration quadrant."""
    skill_display = skill_id.replace("_", " ").title()

    if quadrant == CalibrationQuadrant.CALIBRATED_MASTERY:
        return PedagogicalAction(
            action_type="GENTLE_CONFIRMATION",
            display_message=(
                f"Your self-model is well-calibrated for **{skill_display}**. "
                f"Keep this level of self-awareness as topics get harder."
            ),
            unlock_proof_card=actual_score >= 0.80,
            inject_counterexample=False,
            confidence_nudge=None,
        )
    elif quadrant == CalibrationQuadrant.BLINDSPOT:
        return PedagogicalAction(
            action_type="INJECT_COUNTEREXAMPLE",
            display_message=(
                f"The system has identified specific edge cases in **{skill_display}** "
                f"that your current mental model doesn't account for. "
                f"The next exercise targets exactly those gaps."
            ),
            unlock_proof_card=False,
            inject_counterexample=True,
            confidence_nudge=(
                "Before your next attempt, rate your confidence again after reviewing the counterexamples."
            ),
        )
    elif quadrant == CalibrationQuadrant.IMPOSTER_ZONE:
        return PedagogicalAction(
            action_type="GENERATE_PROOF_CARD",
            display_message=(
                f"The data says you know **{skill_display}** better than you think. "
                f"Your verified Proof Card has been generated — share it or use it as evidence "
                f"in your next application."
            ),
            unlock_proof_card=True,
            inject_counterexample=False,
            confidence_nudge=(
                "Your performance objectively qualified. Trust the evidence, not the doubt."
            ),
        )
    else:
        return PedagogicalAction(
            action_type="ENCOURAGEMENT",
            display_message=(
                f"You correctly identified that **{skill_display}** needs more practice — "
                f"that metacognitive accuracy will help you prioritize your study time well. "
                f"The next resource has been selected to target your specific gaps."
            ),
            unlock_proof_card=False,
            inject_counterexample=False,
            confidence_nudge=None,
        )


# ---------------------------------------------------------------------------
# Public Entry Point
# ---------------------------------------------------------------------------

def evaluate_calibration(payload: CalibrationInput) -> CalibrationReport:
    """
    Deterministic calibration evaluator. Pure function — no database access,
    no LLM calls. Input goes in, structured report comes out.
    """
    quadrant = _classify_quadrant(payload.self_rated_confidence, payload.actual_score)
    label = _get_quadrant_label(quadrant)
    explanation = _build_explanation(
        quadrant, payload.skill_id, payload.self_rated_confidence, payload.actual_score
    )
    action = _build_pedagogical_action(quadrant, payload.skill_id, payload.actual_score)
    gap = round(payload.actual_score - payload.self_rated_confidence, 4)

    logger.info(
        f"[Calibration] profile={payload.profile_id} skill={payload.skill_id} "
        f"self={payload.self_rated_confidence:.2f} actual={payload.actual_score:.2f} "
        f"quadrant={quadrant}"
    )

    return CalibrationReport(
        profile_id=payload.profile_id,
        skill_id=payload.skill_id,
        self_rated_confidence=payload.self_rated_confidence,
        actual_score=payload.actual_score,
        calibration_gap=gap,
        quadrant=quadrant,
        quadrant_label=label,
        explanation=explanation,
        pedagogical_action=action,
    )
