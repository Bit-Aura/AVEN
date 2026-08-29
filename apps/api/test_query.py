import asyncio
from app.db.session import async_session_maker
from app.models.p2p import P2PSession
from app.schemas.p2p import P2PSessionResponse
from sqlalchemy.future import select

async def main():
    try:
        async with async_session_maker() as db:
            stmt = select(P2PSession).where(P2PSession.id == 1)
            res = await db.execute(stmt)
            session = res.scalar_one_or_none()
            print("Session ORM:", session)
            
            response_model = P2PSessionResponse.model_validate(session)
            print("Session Schema:", response_model)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
