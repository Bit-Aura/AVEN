import asyncio
from app.core.db import engine
from app.models.base import Base
import app.models.p2p
from sqlalchemy import text

async def test():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("Created tables")

if __name__ == "__main__":
    asyncio.run(test())
