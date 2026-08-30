import time
import logging
from typing import Dict, Tuple
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.db import async_session

logger = logging.getLogger(__name__)

class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api/v1/goal") or request.url.path.startswith("/api/v1/coach/chat"):
            client_ip = request.client.host if request.client else "unknown"
            
            try:
                # Use database as a distributed rate limiter cache via the `rate_limits` table
                async with async_session() as session:
                    now_ts = time.time()
                    cutoff_ts = now_ts - 60.0

                    # Clean up old limits for this IP
                    cleanup_sql = text("DELETE FROM rate_limits WHERE client_ip = :ip AND timestamp < :cutoff")
                    await session.execute(cleanup_sql, {"ip": client_ip, "cutoff": cutoff_ts})
                    
                    # Insert new request
                    insert_sql = text("INSERT INTO rate_limits (client_ip, timestamp) VALUES (:ip, :now_ts)")
                    await session.execute(insert_sql, {"ip": client_ip, "now_ts": now_ts})
                    
                    # Count requests in last minute
                    count_sql = text("SELECT COUNT(*) FROM rate_limits WHERE client_ip = :ip")
                    result = await session.execute(count_sql, {"ip": client_ip})
                    count = result.scalar()
                    
                    await session.commit()
                    
                    if count > 10:
                        return JSONResponse(status_code=429, content={"detail": "Too many requests"})
            except Exception as e:
                # Fallback to allow request if DB fails to prevent cascading failures
                logger.error(f"Rate Limiter DB Error: {e}")
                
        return await call_next(request)
