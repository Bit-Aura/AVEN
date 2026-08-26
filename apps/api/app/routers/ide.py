from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.sandbox import execute_code_in_sandbox, append_hidden_tests

router = APIRouter(prefix="/ide", tags=["ide"])

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

@router.post("/execute", response_model=IdeExecutionResponse)
async def execute_ide_code(request: IdeExecutionRequest):
    try:
        combined_code = append_hidden_tests(request.language, request.code, request.hidden_tests)
        result = await execute_code_in_sandbox(request.language, combined_code)
        
        # Determine pass/fail based on exit code and stderr
        is_passing = result["code"] == 0 and not result["stderr"]
        
        # If passed, but tests actually failed, the exit code from Piston will be non-zero
        # because the assert will throw an error or throw new Error() in JS
        
        return {
            "stdout": result["stdout"],
            "stderr": result["stderr"],
            "code": result["code"],
            "is_passing": is_passing
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/problem")
async def get_ide_problem(node_id: str, target_role: str = "Software Engineer"):
    try:
        from app.main import ai_provider
        problem = await ai_provider.generate_ide_problem(target_role, node_id)
        return problem
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
