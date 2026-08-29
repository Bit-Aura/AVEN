import re

with open(r"d:\projects\AVEN\apps\api\app\main.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update lifespan to use Postgres advisory lock
new_lifespan = '''@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Trigger auto-initialization in the background safely with Postgres advisory locks.
    """
    from app.core.db import engine, async_session
    from app.services.startup_seeder import run_startup_seeding
    from sqlalchemy import text
    import asyncio
    
    async def safe_seed():
        async with async_session() as session:
            # Create rate limit table if not exists
            await session.execute(text("CREATE TABLE IF NOT EXISTS rate_limits (id SERIAL PRIMARY KEY, client_ip TEXT, timestamp FLOAT)"))
            await session.commit()
            
            # Use advisory lock to prevent multiple workers from seeding at the same time
            # 123456789 is just a unique arbitrary lock ID
            lock_res = await session.execute(text("SELECT pg_try_advisory_lock(123456789)"))
            locked = lock_res.scalar()
            
            if locked:
                logger.info("[Startup] Acquired advisory lock. Proceeding with seeding...")
                try:
                    await run_startup_seeding(engine, async_session, neo4j_client)
                finally:
                    await session.execute(text("SELECT pg_advisory_unlock(123456789)"))
                    await session.commit()
            else:
                logger.info("[Startup] Another worker is seeding. Skipping.")

    asyncio.create_task(safe_seed())
    logger.info("[Startup] Offloaded safe database seeding to background task.")
    yield
'''

content = re.sub(
    r"@asynccontextmanager\nasync def lifespan.*?yield\n",
    new_lifespan,
    content,
    flags=re.DOTALL
)

# 2. Update rate limiter middleware
new_middleware = '''from app.core.rate_limiter import RateLimiterMiddleware
app.add_middleware(RateLimiterMiddleware)'''

content = re.sub(
    r"# Simple In-Memory Rate Limiting for AI endpoints.*?app\.add_middleware\(RateLimitMiddleware\)",
    new_middleware,
    content,
    flags=re.DOTALL
)

# 3. Remove Schemas and add imports
schemas_pattern = r"# --- Pydantic Schemas for API Requests/Responses ---.*?# --- Innovation Endpoint Schemas \(imported from service modules\) ---"
import_schemas = '''# --- Pydantic Schemas for API Requests/Responses ---
from app.schemas.requests import (
    GoalInput, DiagnosticSubmitInput, SkipSimulationInput, 
    CheckpointSubmitInput, CoachChatInput, SliderWeightsInput, 
    CareerPivotInput, CertificateRequest, ScrapeJobsInput, ScrapeEventsInput
)

# --- Innovation Endpoint Schemas (imported from service modules) ---'''
content = re.sub(schemas_pattern, import_schemas, content, flags=re.DOTALL)

# 4. Remove /health and /api/v1/seed, include system router
endpoints_pattern = r"@app\.get\(\"/health\"\).*?raise HTTPException\(status_code=500, detail=f\"Database seeding failed: \{e\}\"\)"
system_router_inclusion = '''from app.routers.system import router as system_router
app.include_router(system_router)'''
content = re.sub(endpoints_pattern, system_router_inclusion, content, flags=re.DOTALL)

with open(r"d:\projects\AVEN\apps\api\app\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("main.py refactored successfully")
