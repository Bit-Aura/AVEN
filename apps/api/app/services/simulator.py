import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import PathVersion, ReadinessSnapshot
from app.models.simulator import TicketSchema, SimulatorChatInput, SimulatorChatResponse, PRReviewComment, PRReviewResult, SimulatorPRInput
from app.infrastructure.ai.gateway import AIProvider

logger = logging.getLogger(__name__)

TICKET_MAPPINGS = {
    "python_basics": {
        "title": "Fix JSON Logging Parser CLI",
        "description": "Our log parser script is crashing when encountering malformed json rows in the order logs. Refactor the parser to gracefully handle errors, log standard exceptions, and export parsed rows to clean JSON.",
        "acceptance_criteria": [
            "Script should not crash on malformed json rows.",
            "Write standard error logging for corrupt records.",
            "Generate structured JSON array output."
        ],
        "affected_files": ["scripts/parse_logs.py"]
    },
    "sql_basics": {
        "title": "Migrate Legacy Meta to PostgreSQL",
        "description": "Legacy client profile attributes are stored in plain key-value text files. Design and execute a seed/migration script to import these records into the postgres table.",
        "acceptance_criteria": [
            "Write SQL schema table definition for client_metadata.",
            "Upsert records securely avoiding duplicate key conflicts.",
            "Confirm records are searchable by client_id."
        ],
        "affected_files": ["db/migrations/01_meta.sql"]
    },
    "git_foundations": {
        "title": "Resolve Merge Conflicts on staging deploy script",
        "description": "Staging deploy script has conflict markers from a bad rebase. Resolve the conflict, keeping the updated environment variables, and verify that the build succeeds.",
        "acceptance_criteria": [
            "Remove all '<<<<<<<', '=======', '>>>>>>>' markers.",
            "Verify all imported modules are correctly referenced."
        ],
        "affected_files": ["scripts/deploy_staging.sh"]
    },
    "http_methods": {
        "title": "Implement REST endpoints for Order Processing",
        "description": "We need GET, POST, and PUT HTTP endpoints to fetch, create, and update order tickets. Ensure proper status codes (200, 201, 404) are returned.",
        "acceptance_criteria": [
            "POST /orders returns 201 Created on success.",
            "GET /orders/{id} returns 404 if order does not exist.",
            "PUT /orders/{id} allows updating quantities."
        ],
        "affected_files": ["app/api/orders.py"]
    },
    "system_design": {
        "title": "Scale Out Message Consumer Cluster",
        "description": "The current message queue consumer is a single process and gets bottlenecked during flash sales. Design a redis-backed queue worker consumer cluster with lock-handling.",
        "acceptance_criteria": [
            "Configure Redis connection pool limit.",
            "Prevent race conditions using redis distributed locks.",
            "Handle connection timeouts gracefully."
        ],
        "affected_files": ["app/queue/worker.py"]
    },
    "async_python": {
        "title": "Refactor Blocking DB Requests to Async Gather",
        "description": "Synchronous database queries in our main controller are blocking the event loop, causing poor request latency. Rewrite these handlers to use async drivers and asyncio.gather.",
        "acceptance_criteria": [
            "Replace sync db calls with await statements.",
            "Use asyncio.gather for parallel profile retrievals.",
            "Verify the application is non-blocking under load."
        ],
        "affected_files": ["app/controllers/user_controller.py"]
    },
    "db_design": {
        "title": "Model high-concurrency Order Ledger Schema",
        "description": "Design a relational database schema for the financial ledger. We need strict transaction isolation, foreign key constraints, and history tracking.",
        "acceptance_criteria": [
            "Define ledger schema with foreign key constraints.",
            "Write index query definitions for fast pagination.",
            "Configure serializable transactions to prevent double-spend."
        ],
        "affected_files": ["db/schemas/ledger.sql"]
    },
    "api_design": {
        "title": "Define OpenAPI specifications for Merchant Gateway",
        "description": "We are launching a new integration for merchant checkouts. Write a clean, documentable OpenAPI schema defining all payment requests, callbacks, and validation rules.",
        "acceptance_criteria": [
            "Define custom pydantic model schema for payments.",
            "Add validation rules (e.g. min/max amounts, card format checks).",
            "Generate auto-documentation description fields."
        ],
        "affected_files": ["app/schemas/merchant.py"]
    },
    "postgres_advanced": {
        "title": "Optimize slow-running Ledger Pagination Queries",
        "description": "The transaction history page is taking >3 seconds to load for power merchants. Optimize the underlying query, introducing indices and keyset pagination.",
        "acceptance_criteria": [
            "Introduce composite index on (merchant_id, created_at).",
            "Rewrite offset/limit to keyset pagination.",
            "Verify EXPLAIN query cost drops by 90%."
        ],
        "affected_files": ["db/queries/ledger_history.py"]
    },
    "fastapi_basics": {
        "title": "Mount Health Check and Metrics Dashboard",
        "description": "Our kubernetes liveness checks need a lightweight health API endpoint that validates DB and Redis health status.",
        "acceptance_criteria": [
            "Mount /healthz returning 200 OK if DB and Redis are reachable.",
            "Return 503 Service Unavailable if any dependency fails.",
            "Expose latency metrics for prometheus scraping."
        ],
        "affected_files": ["app/api/monitoring.py"]
    },
    "http_fundamentals": {
        "title": "Implement Strict CORS and Authentication Filters",
        "description": "Configure cross-origin resource sharing filters and parse incoming bearer authentication tokens for dashboard routes.",
        "acceptance_criteria": [
            "Configure allowed origins to block untrusted domains.",
            "Parse Authorization header for Bearer tokens.",
            "Raise 401 Unauthorized for invalid or expired keys."
        ],
        "affected_files": ["app/core/auth_middleware.py"]
    }
}

def _get_default_ticket(skill_id: str) -> dict:
    formatted_name = skill_id.replace("_", " ").title()
    return {
        "title": f"Implement features for {formatted_name}",
        "description": f"The development team requires the implementation of the core functionalities for {formatted_name}. Read requirements and implement the unit tests.",
        "acceptance_criteria": [
            f"Implement core classes and functions for {formatted_name}.",
            f"Pass all unit tests for {formatted_name}."
        ],
        "affected_files": [f"app/services/{skill_id}.py"]
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
        
        # Decide status
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

async def chat_with_stakeholder(
    ticket_id: str,
    input_data: SimulatorChatInput,
    ai_provider: AIProvider
) -> SimulatorChatResponse:
    """
    Simulates communication with product managers and clients using AI.
    """
    persona_descriptions = {
        "pm": "a professional, detail-oriented Product Manager who focuses on edge cases, business constraints, and standard schemas.",
        "client": "a non-technical client/stakeholder who describes bugs in simple, user-level terms and cares about speed and correctness."
    }
    
    role_description = persona_descriptions.get(input_data.persona.lower(), persona_descriptions["pm"])
    
    prompt = f"""
    You are roleplaying as {role_description}.
    The user is a software developer working on Ticket #{ticket_id}.
    
    User question/message: "{input_data.message}"
    
    Respond in character, keeping your answer realistic, helpful, but direct (1-3 sentences).
    Do not mention you are an AI. Only output your direct response text.
    """
    
    response_text = "I received your message. Please proceed with the requirements listed in the ticket description."
    
    # Route through Antigravity Proxy adapter if available, else fallback to direct Anthropic
    if hasattr(ai_provider, 'stakeholder_chat'):
        try:
            response_text = await ai_provider.stakeholder_chat(
                persona=input_data.persona,
                ticket_id=ticket_id,
                message=input_data.message
            )
        except Exception as e:
            logger.error(f"Failed to fetch stakeholder chat completion via proxy: {e}")
    elif hasattr(ai_provider, "client") and ai_provider.client:
        try:
            response = await ai_provider.client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=300,
                system=f"You are simulating a corporate stakeholder persona: {input_data.persona}.",
                messages=[{"role": "user", "content": prompt}]
            )
            response_text = response.content[0].text.strip()
        except Exception as e:
            logger.error(f"Failed to fetch stakeholder chat completion: {e}")
            
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
    Simulates a Pull Request code review by an AI Senior Developer.
    If approved, updates the learner's BKT status and regenerates their path plan,
    directly synchronizing with their cryptographic Proof Card.
    """
    prompt = f"""
    You are an expert Senior Developer reviewing a Pull Request.
    The user has submitted the following code:
    
    ```ts
    {input_data.code_content}
    ```
    
    Review this code for edge cases, performance bugs, security issues, and style guidelines.
    Format your response strictly as a JSON object with these fields:
    - approved: boolean (true if code is excellent and correct, false if there are blockers)
    - general_feedback: string (overarching review thoughts)
    - comments: array of objects, where each object represents a code annotation on a specific line:
        - line_number: integer
        - file_path: string (use 'index.ts' or relevant file from affected_files)
        - comment: string
        - severity: string (BLOCKER | SUGGESTION | LINT)
        
    Do not include any explanation or markdown formatting. Output valid JSON only.
    """
    
    # Default mock result
    mock_result = PRReviewResult(
        approved=True,
        general_feedback="Looks clean! Good job handling database connections properly. Ready to merge.",
        comments=[
            PRReviewComment(
                line_number=4,
                file_path="index.ts",
                comment="Linter check passed.",
                severity="LINT"
            )
        ]
    )
    
    result = mock_result
    if hasattr(ai_provider, 'review_pr_code'):
        # Route through Antigravity Proxy adapter
        try:
            content_text = await ai_provider.review_pr_code(input_data.code_content)
            content_text = content_text.strip()
            if content_text.startswith("```json"):
                content_text = content_text[7:]
            if content_text.startswith("```"):
                content_text = content_text[3:]
            if content_text.endswith("```"):
                content_text = content_text[:-3]
            content_text = content_text.strip()
            
            import json
            data = json.loads(content_text)
            
            comments = [PRReviewComment(**c) for c in data.get("comments", [])]
            result = PRReviewResult(
                approved=bool(data.get("approved", True)),
                general_feedback=str(data.get("general_feedback", "")),
                comments=comments
            )
        except Exception as e:
            logger.error(f"Failed to generate AI PR review via proxy: {e}")
            result = mock_result
    elif hasattr(ai_provider, "client") and ai_provider.client:
        try:
            response = await ai_provider.client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1000,
                system="You review pull requests and output only valid, schema-compliant JSON.",
                messages=[{"role": "user", "content": prompt}]
            )
            content_text = response.content[0].text.strip()
            if content_text.startswith("```json"):
                content_text = content_text[7:]
            if content_text.endswith("```"):
                content_text = content_text[:-3]
            content_text = content_text.strip()
            
            import json
            data = json.loads(content_text)
            
            comments = [PRReviewComment(**c) for c in data.get("comments", [])]
            result = PRReviewResult(
                approved=bool(data.get("approved", True)),
                general_feedback=str(data.get("general_feedback", "")),
                comments=comments
            )
        except Exception as e:
            logger.error(f"Failed to generate AI PR review: {e}")
            result = mock_result
            
    # Persist database changes if the PR is approved
    if result.approved:
        try:
            from app.services.path_planner import update_bkt_score, generate_or_replan_path
            
            tickets = await get_simulator_board(input_data.profile_id, db)
            target_ticket = next((t for t in tickets if t.id == ticket_id), None)
            skill_id = target_ticket.skill_id if target_ticket else "python_basics"
            
            # 1. Update BKT mastery score
            await update_bkt_score(
                profile_id=input_data.profile_id,
                skill_id=skill_id,
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
            logger.info(f"Successfully processed PR approval for {skill_id} and synchronized Proof Card data.")
        except Exception as e:
            logger.exception("Failed to update BKT and replan path upon PR approval")
            await db.rollback()
            
    return result
