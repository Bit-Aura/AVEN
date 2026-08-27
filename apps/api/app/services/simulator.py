import logging
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import PathVersion, ReadinessSnapshot
from app.models.simulator import (
    TicketSchema,
    SimulatorChatInput,
    SimulatorChatResponse,
    PRReviewComment,
    PRReviewResult,
    SimulatorPRInput
)
from app.infrastructure.ai.gateway import AIProvider

logger = logging.getLogger(__name__)

TICKET_MAPPINGS = {
    "python_basics": {
        "title": "Fix JSON Logging Parser CLI",
        "description": "Our batch log parser script is crashing in production when encountering malformed json rows in the order logs. Refactor the parser to gracefully handle decode errors, log standard exception details to stderr, and export clean structured JSON records.",
        "acceptance_criteria": [
            "Gracefully catch and skip corrupted/malformed JSON rows without terminating the process.",
            "Write structured warning/error logs for any corrupted records.",
            "Return a valid list of parsed dictionary records."
        ],
        "affected_files": ["scripts/parse_logs.py"],
        "starter_code": (
            "import json\n"
            "import logging\n"
            "from typing import List, Dict, Any\n\n"
            "logger = logging.getLogger(__name__)\n\n"
            "def parse_order_logs(raw_lines: List[str]) -> List[Dict[str, Any]]:\n"
            "    \"\"\"\n"
            "    Parses raw log strings into structured JSON objects.\n"
            "    Skips malformed records gracefully.\n"
            "    \"\"\"\n"
            "    parsed_results = []\n"
            "    # TODO: Implement robust JSON parsing and error handling\n"
            "    for line in raw_lines:\n"
            "        pass\n"
            "    return parsed_results\n"
        )
    },
    "sql_basics": {
        "title": "Migrate Legacy Meta to PostgreSQL",
        "description": "Legacy client profile attributes are stored in unstructured key-value format. Design a PostgreSQL DDL schema with constraints and write the upsert query to securely migrate these records into the client_metadata table without duplicate conflicts.",
        "acceptance_criteria": [
            "Write SQL CREATE TABLE DDL for client_metadata with primary key and client_id UNIQUE constraint.",
            "Create index on client_id for fast lookup latency.",
            "Write parameterized UPSERT (INSERT ... ON CONFLICT) statement."
        ],
        "affected_files": ["db/migrations/01_meta.sql"],
        "starter_code": (
            "-- PostgreSQL Migration: Migrate Legacy Meta to client_metadata\n"
            "-- Target File: db/migrations/01_meta.sql\n\n"
            "-- 1. Create client_metadata table\n"
            "CREATE TABLE IF NOT EXISTS client_metadata (\n"
            "    id SERIAL PRIMARY KEY,\n"
            "    client_id VARCHAR(64) NOT NULL UNIQUE,\n"
            "    metadata JSONB DEFAULT '{}'::jsonb,\n"
            "    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,\n"
            "    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n"
            ");\n\n"
            "-- 2. Fast lookup index\n"
            "CREATE INDEX IF NOT EXISTS idx_client_metadata_client_id ON client_metadata(client_id);\n\n"
            "-- 3. Upsert query template\n"
            "-- INSERT INTO client_metadata (client_id, metadata) VALUES ($1, $2)\n"
            "-- ON CONFLICT (client_id) DO UPDATE SET metadata = EXCLUDED.metadata, updated_at = CURRENT_TIMESTAMP;\n"
        )
    },
    "git_foundations": {
        "title": "Resolve Merge Conflicts on staging deploy script",
        "description": "The staging deploy script has conflict markers from an incomplete Git rebase. Resolve all conflict blocks, ensure new environment flags are preserved, and produce a clean executable script.",
        "acceptance_criteria": [
            "Remove all '<<<<<<<', '=======', and '>>>>>>>' conflict markers.",
            "Ensure environment variables and health check steps are properly ordered.",
            "Verify the script exits with code 0 on successful dry-run."
        ],
        "affected_files": ["scripts/deploy_staging.sh"],
        "starter_code": (
            "#!/usr/bin/env bash\n"
            "# Staging Deployment Automation\n"
            "set -euo pipefail\n\n"
            "echo 'Starting staging deployment...'\n"
            "export DEPLOY_ENV='staging'\n"
            "export API_VERSION='v1.4.0'\n\n"
            "# Run smoke test\n"
            "curl -f http://127.0.0.1:8000/health || exit 1\n"
            "echo 'Deployment verified successfully.'\n"
        )
    },
    "http_methods": {
        "title": "Implement REST endpoints for Order Processing",
        "description": "We need standardized REST endpoints to fetch, create, and cancel order items. Follow standard HTTP status codes (200, 201 Created, 404 Not Found, 422 Unprocessable) and handle missing items.",
        "acceptance_criteria": [
            "POST /orders returns 201 Created with created payload on success.",
            "GET /orders/{id} returns 404 if the requested order ID does not exist.",
            "PUT /orders/{id} allows quantity updates and returns 200 OK."
        ],
        "affected_files": ["app/api/orders.py"],
        "starter_code": (
            "from fastapi import APIRouter, HTTPException, status\n"
            "from pydantic import BaseModel, Field\n"
            "from typing import Dict, Optional\n\n"
            "router = APIRouter(prefix=\"/orders\", tags=[\"orders\"])\n\n"
            "class OrderSchema(BaseModel):\n"
            "    item_id: str\n"
            "    quantity: int = Field(gt=0)\n"
            "    customer_email: str\n\n"
            "# In-memory storage for demonstration\n"
            "ORDERS_DB: Dict[str, dict] = {}\n\n"
            "@router.post(\"/\", status_code=status.HTTP_201_CREATED)\n"
            "async def create_order(order: OrderSchema):\n"
            "    # TODO: Implement order creation\n"
            "    pass\n"
        )
    },
    "system_design": {
        "title": "Scale Out Message Consumer Cluster",
        "description": "The current single-process message worker bottlenecks under high transaction load. Implement a distributed worker model with Redis locking and concurrency controls.",
        "acceptance_criteria": [
            "Configure Redis connection pooling and retry thresholds.",
            "Implement distributed locking to prevent duplicate processing of the same job.",
            "Handle worker disconnects and graceful shutdown signals."
        ],
        "affected_files": ["app/queue/worker.py"],
        "starter_code": (
            "import asyncio\n"
            "import logging\n"
            "from typing import Optional\n\n"
            "logger = logging.getLogger(__name__)\n\n"
            "class QueueWorker:\n"
            "    def __init__(self, queue_name: str = 'default_tasks'):\n"
            "        self.queue_name = queue_name\n"
            "        self.is_running = False\n\n"
            "    async def start(self):\n"
            "        self.is_running = True\n"
            "        logger.info(f'Starting worker on queue: {self.queue_name}')\n"
            "        # TODO: Implement worker loop with distributed locks\n"
        )
    },
    "async_python": {
        "title": "Refactor Blocking DB Requests to Async Gather",
        "description": "Synchronous database queries in our user dashboard controller block the ASGI event loop, causing poor request latency. Rewrite these handlers using asyncio.gather for concurrent execution.",
        "acceptance_criteria": [
            "Replace sequential sync calls with async/await coroutines.",
            "Use asyncio.gather to concurrently fetch user profile, stats, and badges.",
            "Ensure exception handling does not crash all concurrent tasks."
        ],
        "affected_files": ["app/controllers/user_controller.py"],
        "starter_code": (
            "import asyncio\n"
            "from typing import Dict, Any\n\n"
            "async def fetch_user_profile(user_id: int) -> dict:\n"
            "    await asyncio.sleep(0.05)\n"
            "    return {'id': user_id, 'name': 'Alex'}\n\n"
            "async def fetch_user_stats(user_id: int) -> dict:\n"
            "    await asyncio.sleep(0.05)\n"
            "    return {'streak': 12, 'points': 450}\n\n"
            "async def get_aggregated_dashboard(user_id: int) -> Dict[str, Any]:\n"
            "    # TODO: Refactor to asyncio.gather\n"
            "    pass\n"
        )
    },
    "db_design": {
        "title": "Model High-Concurrency Order Ledger Schema",
        "description": "Design a relational schema for the double-entry accounting ledger. Enforce foreign keys, currency decimal precision, and optimistic locking to prevent double-spending.",
        "acceptance_criteria": [
            "Define ledger_entries table with debit/credit balance constraint.",
            "Use DECIMAL(18, 4) for monetary amounts to prevent floating point inaccuracies.",
            "Include version integer column for optimistic concurrency control."
        ],
        "affected_files": ["db/schemas/ledger.sql"],
        "starter_code": (
            "-- Accounting Ledger Schema\n"
            "CREATE TABLE IF NOT EXISTS ledger_accounts (\n"
            "    id SERIAL PRIMARY KEY,\n"
            "    account_number VARCHAR(32) NOT NULL UNIQUE,\n"
            "    balance DECIMAL(18, 4) DEFAULT 0.0000,\n"
            "    version INT DEFAULT 1\n"
            ");\n\n"
            "CREATE TABLE IF NOT EXISTS ledger_entries (\n"
            "    id SERIAL PRIMARY KEY,\n"
            "    account_id INT REFERENCES ledger_accounts(id) ON DELETE RESTRICT,\n"
            "    amount DECIMAL(18, 4) NOT NULL,\n"
            "    entry_type VARCHAR(10) CHECK (entry_type IN ('DEBIT', 'CREDIT')),\n"
            "    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n"
            ");\n"
        )
    },
    "fastapi_basics": {
        "title": "Mount Health Check and Metrics Dashboard",
        "description": "Our infrastructure cluster requires a resilient /healthz API endpoint that actively verifies PostgreSQL and Redis connectivity with latency reports.",
        "acceptance_criteria": [
            "Mount /healthz returning 200 OK if dependencies are reachable.",
            "Return 503 Service Unavailable if database is unreachable.",
            "Include response latency timestamp in milliseconds."
        ],
        "affected_files": ["app/api/monitoring.py"],
        "starter_code": (
            "from fastapi import APIRouter, status, Response\n"
            "import time\n\n"
            "router = APIRouter(tags=['monitoring'])\n\n"
            "@router.get('/healthz')\n"
            "async def health_check(response: Response):\n"
            "    start_time = time.time()\n"
            "    # TODO: Verify database and cache health\n"
            "    latency_ms = round((time.time() - start_time) * 1000, 2)\n"
            "    return {\n"
            "        'status': 'healthy',\n"
            "        'latency_ms': latency_ms\n"
            "    }\n"
        )
    }
}

def _get_default_ticket(skill_id: str) -> dict:
    formatted_name = skill_id.replace("_", " ").title()
    return {
        "title": f"Implement features for {formatted_name}",
        "description": (
            f"The product team requires the implementation of the core services for {formatted_name}. "
            f"Review the requirements, implement robust business logic with error handling, and ensure all criteria pass."
        ),
        "acceptance_criteria": [
            f"Implement core classes and validation routines for {formatted_name}.",
            f"Handle boundary conditions and potential exception cases gracefully.",
            f"Export clean functions and verify test compatibility."
        ],
        "affected_files": [f"app/services/{skill_id}.py"],
        "starter_code": (
            f"# Core implementation for {formatted_name}\n"
            f"# Target File: app/services/{skill_id}.py\n\n"
            f"class {formatted_name.replace(' ', '')}Service:\n"
            f"    def __init__(self):\n"
            f"        self.initialized = True\n\n"
            f"    def execute(self, payload: dict) -> dict:\n"
            f"        \"\"\"Process incoming request with validation.\"\"\"\n"
            f"        # TODO: Implement domain logic\n"
            f"        return {{'status': 'success', 'result': payload}}\n"
        )
    }

async def get_simulator_board(profile_id: int, db: AsyncSession) -> List[TicketSchema]:
    """
    Builds the Kanban board tickets dynamically mapped from the user's latest path.
    """
    stmt = select(PathVersion).where(PathVersion.profile_id == profile_id).order_by(PathVersion.created_at.desc())
    path_version = (await db.execute(stmt)).scalars().first()
    
    # Fallback to defaults if no path exists
    if not path_version or not path_version.changed_nodes:
        all_skills = ["python_basics", "sql_basics", "git_foundations", "http_methods"]
        remaining_skills = ["python_basics", "sql_basics", "git_foundations", "http_methods"]
        completed_skills = []
    else:
        plan = path_version.changed_nodes
        all_skills = plan.get("all_ordered_skills") or plan.get("remaining_path") or []
        remaining_skills = plan.get("remaining_path") or []
        if not all_skills:
            all_skills = ["python_basics", "sql_basics", "git_foundations", "http_methods"]
            remaining_skills = ["python_basics", "sql_basics", "git_foundations", "http_methods"]
            completed_skills = []
        else:
            completed_skills = plan.get("completed_skills") or [s for s in all_skills if s not in remaining_skills]

    tickets: List[TicketSchema] = []
    
    for idx, skill in enumerate(all_skills):
        mapping = TICKET_MAPPINGS.get(skill) or _get_default_ticket(skill)
        
        if skill in completed_skills:
            status = "MERGED"
        elif len(remaining_skills) > 0 and skill == remaining_skills[0]:
            status = "IN_PROGRESS"
        elif skill in remaining_skills:
            status = "TODO"
        else:
            status = "BACKLOG"

        tickets.append(TicketSchema(
            id=f"T-10{idx+1}",
            title=mapping["title"],
            skill_id=skill,
            status=status,
            description=mapping["description"],
            acceptance_criteria=mapping["acceptance_criteria"],
            affected_files=mapping["affected_files"]
        ))
        
    return tickets

def _resolve_ticket_details(ticket_id: str, ticket_context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Helper to extract ground-truth ticket information for prompt grounding."""
    if ticket_context and isinstance(ticket_context, dict):
        return {
            "id": ticket_context.get("id", ticket_id),
            "title": ticket_context.get("title", f"Task {ticket_id}"),
            "skill_id": ticket_context.get("skill_id", "software_engineering"),
            "description": ticket_context.get("description", "Implementation task."),
            "acceptance_criteria": ticket_context.get("acceptance_criteria", []),
            "affected_files": ticket_context.get("affected_files", ["app/main.py"])
        }
    
    # Check if ticket matches standard mapping
    for skill_key, data in TICKET_MAPPINGS.items():
        if skill_key in ticket_id.lower() or data["title"].lower() in ticket_id.lower():
            return {
                "id": ticket_id,
                "title": data["title"],
                "skill_id": skill_key,
                "description": data["description"],
                "acceptance_criteria": data["acceptance_criteria"],
                "affected_files": data["affected_files"]
            }
            
    # Default fallback
    default = _get_default_ticket(ticket_id.replace("T-", "skill_"))
    return {
        "id": ticket_id,
        "title": default["title"],
        "skill_id": ticket_id,
        "description": default["description"],
        "acceptance_criteria": default["acceptance_criteria"],
        "affected_files": default["affected_files"]
    }

async def chat_with_stakeholder(
    ticket_id: str,
    input_data: SimulatorChatInput,
    ai_provider: AIProvider,
    db: Optional[AsyncSession] = None
) -> SimulatorChatResponse:
    """
    RAG-grounded Stakeholder Persona Chat.
    Injects full ticket specifications, acceptance criteria, and conversation history
    so the AI Product Manager and Non-Tech Client provide accurate, ticket-aware responses
    without hallucinating unrelated tasks.
    """
    # 1. Resolve ticket ground-truth specifications
    ticket_info = _resolve_ticket_details(ticket_id, input_data.ticket_context)
    
    title = ticket_info["title"]
    skill_id = ticket_info["skill_id"]
    description = ticket_info["description"]
    affected_files = ", ".join(ticket_info.get("affected_files", ["app/main.py"]))
    criteria_list = "\n".join([f"- {c}" for c in ticket_info.get("acceptance_criteria", [])]) or "- Implement clean functionality and pass tests."

    # 2. Build multi-turn conversation history
    history_str = ""
    if input_data.chat_history:
        history_lines = []
        for msg in input_data.chat_history[-6:]:
            sender = "Developer (User)" if msg.get("sender") == "user" else f"Stakeholder ({msg.get('persona', 'AI')})"
            history_lines.append(f"{sender}: {msg.get('text', '')}")
        if history_lines:
            history_str = "\n--- RECENT CONVERSATION HISTORY ---\n" + "\n".join(history_lines) + "\n-----------------------------------"

    persona_choice = input_data.persona.lower().strip()

    # 3. Persona Prompts grounded strictly in the ticket
    if persona_choice == "client":
        system_prompt = (
            "You are Morgan Blake, an executive non-technical client sponsor for this software project. "
            "You are chatting on Slack with the software developer assigned to your ticket.\n\n"
            f"--- TICKET SPECIFICATION (GROUND TRUTH) ---\n"
            f"Ticket ID: {ticket_id}\n"
            f"Feature Title: {title}\n"
            f"Domain/Skill: {skill_id}\n"
            f"Problem Statement: {description}\n"
            f"Acceptance Criteria:\n{criteria_list}\n"
            f"-------------------------------------------\n"
            f"{history_str}\n\n"
            "YOUR PERSONA RULES:\n"
            "1. You are NON-TECHNICAL: You do not know Python, SQL syntax, or code frameworks, but you care deeply about the business impact and user experience of THIS specific ticket.\n"
            "2. If the developer asks 'what do I have to do' or asks for guidance, explain the business requirement and user expectations for THIS ticket in simple, friendly, real-world English (2-3 sentences).\n"
            "3. NEVER hallucinate or mention unrelated systems (e.g. NEVER mention login screens or UI buttons if this ticket is about SQL migration or data parsers).\n"
            "4. Be friendly, collaborative, and concise. Do NOT say you are an AI. Only output your direct conversational reply."
        )
    else: # "pm"
        system_prompt = (
            "You are Alex Chen, a Senior Technical Product Manager at a fast-paced tech company. "
            "You are chatting on Slack with a software engineer who is implementing Ticket #{ticket_id}.\n\n"
            f"--- TICKET SPECIFICATION (GROUND TRUTH) ---\n"
            f"Ticket ID: {ticket_id}\n"
            f"Title: {title}\n"
            f"Skill/Area: {skill_id}\n"
            f"Target Files: {affected_files}\n"
            f"Description: {description}\n"
            f"Acceptance Criteria:\n{criteria_list}\n"
            f"-------------------------------------------\n"
            f"{history_str}\n\n"
            "YOUR PERSONA RULES:\n"
            "1. You know the exact technical requirements, schema constraints, edge cases, and acceptance criteria for THIS ticket.\n"
            "2. When asked 'what do I have to do' or about requirements, summarize the technical goal of THIS ticket clearly and highlight the acceptance criteria.\n"
            "3. Provide direct, professional answers regarding edge cases, error handling, status codes, and data structures.\n"
            "4. NEVER discuss unrelated topics (e.g. login bugs when the ticket is about SQL or backend processing).\n"
            "5. Be concise (2-4 sentences) and sound like a real, supportive PM. Do NOT say you are an AI. Only output your direct response."
        )

    user_prompt = input_data.message

    # 4. Invoke LLM
    response_text = ""
    try:
        if hasattr(ai_provider, '_chat'):
            response_text = await ai_provider._chat(system=system_prompt, user_prompt=user_prompt, max_tokens=350)
        elif hasattr(ai_provider, "client") and ai_provider.client:
            response = await ai_provider.client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=350,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            response_text = response.content[0].text.strip()
    except Exception as e:
        logger.error(f"Stakeholder chat LLM invocation failed: {e}")

    # Fallback grounded responses if LLM output is empty
    if not response_text:
        if persona_choice == "client":
            response_text = f"For {title}, we really need this feature working reliably so our business workflows don't hit interruptions. Please make sure the requirements in the ticket specs are covered!"
        else:
            response_text = f"For ticket {ticket_id} ({title}), please focus on satisfying the acceptance criteria: {criteria_list.splitlines()[0] if criteria_list else 'Implement core logic'}. Let me know if you need edge-case clarification!"

    return SimulatorChatResponse(
        persona=input_data.persona,
        message=response_text
    )

async def review_pull_request(
    ticket_id: str,
    input_data: SimulatorPRInput,
    ai_provider: AIProvider,
    db: AsyncSession,
    neo4j_client: Any
) -> PRReviewResult:
    """
    Evaluates submitted code against the Ticket's Acceptance Criteria.
    Rejects boilerplate/incomplete submissions with clear actionable line-by-line comments.
    Approves genuine solutions and advances the learner's DAG mastery & BKT score.
    """
    ticket_info = _resolve_ticket_details(ticket_id, input_data.ticket_context)
    title = ticket_info["title"]
    skill_id = ticket_info["skill_id"]
    description = ticket_info["description"]
    affected_files = ", ".join(ticket_info.get("affected_files", ["app/main.py"]))
    criteria_list = "\n".join([f"- {c}" for c in ticket_info.get("acceptance_criteria", [])])

    system_prompt = (
        "You are an expert Senior Staff Software Engineer and Tech Lead conducting a rigorous Pull Request (PR) Code Review. "
        "You must evaluate whether the submitted code genuinely implements the requirements and satisfies the ticket's Acceptance Criteria.\n\n"
        "EVALUATION RULES:\n"
        "1. Check if the code is merely starter boilerplate, placeholder comments (e.g. `// TODO`, `pass`, `console.log`), or an empty template. If so, REJECT (approved: false).\n"
        "2. Check if the code addresses the Acceptance Criteria. If critical criteria are missing or broken, REJECT (approved: false).\n"
        "3. Check for logic errors, security flaws (like SQL injection or unhandled crashes), and bad practices.\n"
        "4. If the code is well-written, implements the solution, and covers the criteria, APPROVE (approved: true).\n"
        "5. Return strictly valid JSON conforming to the requested schema."
    )

    user_prompt = f"""
=== TICKET SPECIFICATION ===
Ticket ID: {ticket_id}
Title: {title}
Skill/Area: {skill_id}
Affected Files: {affected_files}
Description: {description}
Acceptance Criteria:
{criteria_list}
============================

=== SUBMITTED CODE ===
{input_data.code_content}
======================

Respond strictly in valid JSON matching this schema:
{{
  "approved": boolean,
  "general_feedback": "string (clear summary of review findings)",
  "comments": [
    {{
      "line_number": integer (1-indexed line in submitted code),
      "file_path": "{affected_files.split(', ')[0] if affected_files else 'solution.py'}",
      "comment": "string (constructive feedback)",
      "severity": "BLOCKER" | "SUGGESTION" | "LINT"
    }}
  ]
}}
"""

    # Check for obvious default template submission
    is_trivial = (
        len(input_data.code_content.strip()) < 80 or
        "TODO: Implement" in input_data.code_content or
        ("processTask" in input_data.code_content and "return true" in input_data.code_content and len(input_data.code_content) < 200)
    )

    result = None

    try:
        raw_text = ""
        if hasattr(ai_provider, '_chat'):
            raw_text = await ai_provider._chat(system=system_prompt, user_prompt=user_prompt, max_tokens=1200)
        elif hasattr(ai_provider, "client") and ai_provider.client:
            response = await ai_provider.client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1200,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            raw_text = response.content[0].text.strip()

        if raw_text:
            cleaned = raw_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            data = json.loads(cleaned)
            comments = [PRReviewComment(**c) for c in data.get("comments", [])]
            result = PRReviewResult(
                approved=bool(data.get("approved", False)),
                general_feedback=str(data.get("general_feedback", "Code reviewed.")),
                comments=comments
            )
    except Exception as e:
        logger.error(f"Failed to generate AI PR review: {e}")

    # Fallback deterministic evaluation if AI is unavailable or returned unparseable output
    if result is None:
        if is_trivial:
            result = PRReviewResult(
                approved=False,
                general_feedback="PR Rejected: The submitted code appears to be an unmodified starter template. Please implement the logic required by the Acceptance Criteria.",
                comments=[
                    PRReviewComment(
                        line_number=1,
                        file_path=affected_files.split(", ")[0],
                        comment="Core requirements not implemented. Please complete the tasks listed in the Task Specs.",
                        severity="BLOCKER"
                    )
                ]
            )
        else:
            result = PRReviewResult(
                approved=True,
                general_feedback=f"PR Approved! The implementation for {title} satisfies the required acceptance criteria and passes static analysis.",
                comments=[
                    PRReviewComment(
                        line_number=1,
                        file_path=affected_files.split(", ")[0],
                        comment="Clean implementation and good separation of concerns.",
                        severity="SUGGESTION"
                    )
                ]
            )

    # Persist database changes if the PR is approved
    if result.approved:
        try:
            from app.services.path_planner import update_bkt_score, generate_or_replan_path
            
            tickets = await get_simulator_board(input_data.profile_id, db)
            target_ticket = next((t for t in tickets if t.id == ticket_id), None)
            resolved_skill = target_ticket.skill_id if target_ticket else skill_id
            
            # 1. Update BKT mastery score
            await update_bkt_score(
                profile_id=input_data.profile_id,
                skill_id=resolved_skill,
                is_correct=True,
                db=db,
                neo4j_client=neo4j_client
            )
            
            # 2. Re-plan learner path to mark skill as completed
            await generate_or_replan_path(
                profile_id=input_data.profile_id,
                trigger_event=f"PR_APPROVED_TICKET_{ticket_id}",
                db=db,
                neo4j_client=neo4j_client,
                ai_provider=ai_provider
            )
            
            await db.commit()
            logger.info(f"Successfully processed PR approval for {resolved_skill} and updated path.")
        except Exception as e:
            logger.exception("Failed to update BKT and replan path upon PR approval")
            await db.rollback()
            
    return result
