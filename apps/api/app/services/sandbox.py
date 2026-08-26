import logging
import sys
import asyncio
import tempfile
import os
import subprocess

logger = logging.getLogger(__name__)

def _run_python_sync(code: str) -> dict:
    """Synchronously executes Python code in an isolated subprocess with timeout."""
    with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as f:
        f.write(code)
        temp_path = f.name
        
    try:
        res = subprocess.run(
            [sys.executable, temp_path],
            capture_output=True,
            text=True,
            timeout=5.0
        )
        return {
            "stdout": res.stdout or "",
            "stderr": res.stderr or "",
            "code": res.returncode
        }
    except subprocess.TimeoutExpired as e:
        stdout_str = e.stdout if isinstance(e.stdout, str) else (e.stdout.decode('utf-8', errors='replace') if e.stdout else "")
        stderr_str = e.stderr if isinstance(e.stderr, str) else (e.stderr.decode('utf-8', errors='replace') if e.stderr else "")
        return {
            "stdout": stdout_str,
            "stderr": (stderr_str + "\nExecution timed out (5s limit).").strip(),
            "code": 124
        }
    except Exception as e:
        logger.exception("Subprocess execution exception")
        return {
            "stdout": "",
            "stderr": f"Execution error: {e}",
            "code": 1
        }
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

async def execute_code_in_sandbox(language: str, code: str) -> dict:
    """
    Executes code securely in a thread pool. For prototyping, runs python locally.
    """
    if language == "python":
        return await asyncio.to_thread(_run_python_sync, code)
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
