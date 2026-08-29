import asyncio
from app.db.session import async_session_maker
from app.models.p2p import P2PSession, P2PQueue
from sqlalchemy import update, delete

async def main():
    async with async_session_maker() as db:
        # Clear queue
        await db.execute(delete(P2PQueue))
        
        # Mark all old sessions as COMPLETED so they don't trigger "Match Found" instantly
        stmt = update(P2PSession).where(
            P2PSession.status.in_(["WAITING", "IN_PROGRESS_1", "SWAPPING", "IN_PROGRESS_2"])
        ).values(status="COMPLETED")
        await db.execute(stmt)
        
        await db.commit()
        print("Successfully cleaned up stuck P2P sessions and queue!")

asyncio.run(main())
