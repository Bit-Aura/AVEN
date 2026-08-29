from typing import List, Dict, Any, Optional
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.domain import CodingSandboxSubmission
from app.services.sandbox import execute_code_in_sandbox, append_hidden_tests

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ide", tags=["ide"])

MAX_CODE_SIZE_BYTES = 65536 # 64 KB limit

# --- Schemas ---

class IdeExecutionRequest(BaseModel):
    language: str
    code: str
    node_id: str
    hidden_tests: str = ""

class IdeExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    code: int
    is_passing: bool

class CodingQuestionRequest(BaseModel):
    node_id: str = Field(..., description="Milestone / node identifier, e.g. 'python_basics'")
    target_role: str = Field(default="Backend Software Engineer", description="Target role context")
    skill_name: Optional[str] = Field(default=None, description="Display name for the skill")
    difficulty: str = Field(default="Intermediate", description="Beginner | Intermediate | Advanced")
    programming_language: str = Field(default="python", description="python | typescript | javascript")
    profile_id: Optional[int] = Field(default=None, description="Optional learner profile ID")

class ChallengeExample(BaseModel):
    input: str
    output: str
    explanation: Optional[str] = None

class CodingQuestionResponse(BaseModel):
    question_id: str
    title: str
    problem_statement: str
    skill: str
    difficulty: str
    programming_language: str
    starter_code: str
    constraints: List[str] = []
    examples: List[Dict[str, Any]] = []
    expected_concepts: List[str] = []
    evaluation_rubric: List[str] = []
    hints: List[str] = []
    hidden_tests: Optional[str] = ""
    # Established compatibility fields
    description: Optional[str] = None
    default_code: Optional[str] = None

class CodeEvaluationRequest(BaseModel):
    node_id: str = Field(..., description="Milestone / skill identifier")
    programming_language: str = Field(..., description="Programming language of the submitted code")
    submitted_code: str = Field(..., description="Student code to evaluate")
    problem_statement: str = Field(default="", description="Authoritative problem statement context")
    problem_title: Optional[str] = Field(default=None, description="Title of the problem")
    question_id: Optional[str] = Field(default=None, description="Question ID")
    profile_id: Optional[int] = Field(default=None, description="Learner profile ID")
    target_role: Optional[str] = Field(default="Software Engineer", description="Target role context")
    skill_name: Optional[str] = Field(default=None, description="Skill name being tested")
    expected_concepts: Optional[List[str]] = Field(default=None, description="Expected concepts list")
    evaluation_rubric: Optional[List[str]] = Field(default=None, description="Rubric criteria")
    hints: Optional[List[str]] = Field(default=None, description="Hints provided")

class ComplexityAnalysisSchema(BaseModel):
    time_complexity: str
    space_complexity: str
    details: str

class CodeEvaluationResponse(BaseModel):
    score: int
    verdict: str
    summary: str
    correctness_score: int
    reasoning_score: int
    code_quality_score: int
    strengths: List[str]
    issues: List[str]
    improvements: List[str]
    detailed_feedback: str
    complexity_analysis: ComplexityAnalysisSchema
    next_steps: List[str]
    is_passing: bool
    evaluation_type: str = "ai_static_reasoning"
    evaluation_note: str
    submission_id: Optional[int] = None


# --- Endpoints ---

@router.post("/execute", response_model=IdeExecutionResponse)
async def execute_ide_code(request: IdeExecutionRequest):
    """
    Executes code in local secure subprocess (for Python syntax checks & tests).
    """
    try:
        combined_code = append_hidden_tests(request.language, request.code, request.hidden_tests)
        result = await execute_code_in_sandbox(request.language, combined_code)
        
        is_passing = result["code"] == 0 and not result["stderr"]
        
        return {
            "stdout": result["stdout"],
            "stderr": result["stderr"],
            "code": result["code"],
            "is_passing": is_passing
        }
    except Exception as e:
        logger.exception("Code execution error")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/question/generate", response_model=CodingQuestionResponse)
async def generate_coding_question_endpoint(request: CodingQuestionRequest):
    """
    Generates a structured, role-tailored coding challenge using Claude AI.
    """
    try:
        from app.main import ai_provider
        
        challenge = await ai_provider.generate_coding_question(
            target_role=request.target_role,
            milestone_id=request.node_id,
            skill_name=request.skill_name,
            difficulty=request.difficulty,
            programming_language=request.programming_language
        )
        
        # Populate established compat fields
        challenge["description"] = challenge.get("problem_statement")
        challenge["default_code"] = challenge.get("starter_code")
        
        return challenge
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to generate coding question")
        raise HTTPException(status_code=500, detail=f"Failed to generate coding challenge: {e}")


@router.get("/problem")
async def get_ide_problem(
    node_id: str,
    target_role: str = "Software Engineer",
    language: str = "python"
):
    """
    Retrieves or generates an IDE problem for the active node and target role.
    Maintains backward compatibility with existing frontend calls.
    """
    try:
        from app.main import ai_provider
        
        if hasattr(ai_provider, "generate_coding_question"):
            challenge = await ai_provider.generate_coding_question(
                target_role=target_role,
                milestone_id=node_id,
                skill_name=node_id.replace("_", " ").title(),
                programming_language=language
            )
            # Ensure backward-compatible keys exist
            challenge["description"] = challenge.get("problem_statement", "")
            challenge["default_code"] = challenge.get("starter_code", "")
            return challenge
        else:
            problem = await ai_provider.generate_ide_problem(target_role, node_id)
            return problem
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to fetch IDE problem")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate", response_model=CodeEvaluationResponse)
async def evaluate_student_code_endpoint(
    request: CodeEvaluationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Evaluates student code submission using Claude AI static reasoning.
    Does NOT claim live execution occurred; provides deep algorithmic and code quality feedback.
    Persists submission attempt and updates milestone progress when passing.
    """
    # 1. Validate payload size
    if len(request.submitted_code.encode("utf-8")) > MAX_CODE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Submitted code exceeds maximum allowed size of {MAX_CODE_SIZE_BYTES // 1024} KB."
        )

    if not request.submitted_code.strip():
        raise HTTPException(
            status_code=400,
            detail="Submitted code cannot be empty."
        )

    try:
        from app.main import ai_provider
        
        resolved_skill = request.skill_name or request.node_id.replace("_", " ").title()
        
        evaluation = await ai_provider.evaluate_student_code(
            problem_statement=request.problem_statement or f"Implement solution for {resolved_skill}",
            submitted_code=request.submitted_code,
            programming_language=request.programming_language,
            target_role=request.target_role or "Software Engineer",
            skill_name=resolved_skill,
            expected_concepts=request.expected_concepts,
            evaluation_rubric=request.evaluation_rubric,
            hints=request.hints
        )
        
        # 2. Persist submission in database
        submission_id = None
        try:
            submission = CodingSandboxSubmission(
                profile_id=request.profile_id,
                node_id=request.node_id,
                question_id=request.question_id,
                problem_title=request.problem_title or f"{resolved_skill} Challenge",
                language=request.programming_language,
                submitted_code=request.submitted_code,
                score=float(evaluation["score"]),
                verdict=evaluation["verdict"],
                is_passing=evaluation["is_passing"],
                evaluation_result=evaluation
            )
            db.add(submission)
            await db.flush()
            submission_id = submission.id
            
            # 3. If passing and profile_id present, update Bayesian Knowledge Tracing
            if evaluation["is_passing"] and request.profile_id:
                try:
                    from app.services.path_planner import update_bkt_score
                    from app.infrastructure.neo4j.client import neo4j_client
                    await update_bkt_score(
                        profile_id=request.profile_id,
                        skill_id=request.node_id,
                        is_correct=True,
                        db=db,
                        neo4j_client=neo4j_client
                    )
                except Exception as bkt_err:
                    logger.warning(f"[IDE Router] Non-critical BKT score update warning: {bkt_err}")
                    
            await db.commit()
        except Exception as db_err:
            logger.warning(f"[IDE Router] Could not persist coding sandbox attempt: {db_err}")
            await db.rollback()
            
        evaluation["submission_id"] = submission_id
        return evaluation
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Code evaluation failed")
        raise HTTPException(status_code=500, detail=f"Code evaluation service error: {e}")
