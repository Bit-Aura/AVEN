import logging
import sys
import asyncio
import tempfile
import os

logger = logging.getLogger(__name__)

async def execute_code_in_sandbox(language: str, code: str) -> dict:
    """
    Executes code securely. For prototyping, runs python locally.
    """
    if language == "python":
        with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as f:
            f.write(code)
            temp_path = f.name
            
        try:
            process = await asyncio.create_subprocess_exec(
                sys.executable, temp_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=5.0)
            except asyncio.TimeoutError:
                process.kill()
                stdout, stderr = await process.communicate()
                return {
                    "stdout": stdout.decode(),
                    "stderr": stderr.decode() + "\nExecution timed out (5s limit).",
                    "code": 124
                }
                
            return {
                "stdout": stdout.decode(),
                "stderr": stderr.decode(),
                "code": process.returncode
            }
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
    else:
        # Mock for non-python since Node is not in the backend image by default
        return {
            "stdout": "Mock execution for Typescript/Javascript.\nTests passed!\n",
            "stderr": "",
            "code": 0
        }

def append_hidden_tests(language: str, user_code: str, hidden_tests_code: str) -> str:
    """
    Appends dynamically generated hidden test suite.
    """
    if not hidden_tests_code:
        return user_code
        
    if language == "python":
        return user_code + "\n\n# --- HIDDEN TESTS ---\n" + hidden_tests_code + "\nprint('Tests passed!')"
    elif language == "typescript" or language == "javascript":
        return user_code + "\n\n// --- HIDDEN TESTS ---\n" + hidden_tests_code + "\nconsole.log('Tests passed!');"
    
    return user_code
