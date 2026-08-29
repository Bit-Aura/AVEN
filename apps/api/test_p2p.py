import asyncio
from app.core.db import get_db, async_session
from app.schemas.p2p import P2PQueueJoin
from app.routers.p2p import join_queue

async def test():
    async with async_session() as db:
        try:
            req = P2PQueueJoin(user_id="test1", topic="sys")
            res = await join_queue(req, db)
            print("Success:", res)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
