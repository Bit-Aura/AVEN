import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, desc, asc

from app.models.domain import HackathonEvent
from app.schemas.hackathon_schemas import HackathonEventResponse, HackathonListResponse

logger = logging.getLogger(__name__)


def derive_event_status(
    reg_deadline: Optional[str],
    start_date: Optional[str],
    end_date: Optional[str]
) -> str:
    """
    Derives event status ('open', 'upcoming', 'closed') based on current UTC time vs ISO date bounds.
    """
    now = datetime.now(timezone.utc)

    # 1. Registration deadline check
    if reg_deadline:
        try:
            clean_str = reg_deadline.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_str)
            if dt < now:
                return "closed"
        except Exception:
            pass

    # 2. Event end date check
    if end_date:
        try:
            clean_str = end_date.replace("Z", "+00:00")
            e_dt = datetime.fromisoformat(clean_str)
            if e_dt < now:
                return "closed"
        except Exception:
            pass

    # 3. Event start date check
    if start_date:
        try:
            clean_str = start_date.replace("Z", "+00:00")
            s_dt = datetime.fromisoformat(clean_str)
            if s_dt > now:
                return "upcoming"
        except Exception:
            pass

    return "open"


def _to_response_model(event: HackathonEvent) -> HackathonEventResponse:
    """Helper to convert ORM model instance to Pydantic response schema with derived status."""
    status_str = derive_event_status(
        reg_deadline=event.registration_deadline,
        start_date=event.event_start_date,
        end_date=event.event_end_date
    )
    
    scraped_at_str = (
        event.scraped_at.isoformat()
        if isinstance(event.scraped_at, datetime)
        else str(event.scraped_at or "")
    )

    return HackathonEventResponse(
        id=event.id,
        external_id=event.external_id,
        source=event.source,
        title=event.title,
        organizer=event.organizer,
        description=event.description,
        url=event.url,
        location=event.location,
        city=event.city,
        state=event.state,
        country=event.country,
        mode=event.mode or "online",
        prize_pool=event.prize_pool,
        registration_deadline=event.registration_deadline,
        event_start_date=event.event_start_date,
        event_end_date=event.event_end_date,
        skills=event.skills or [],
        cover_image=event.cover_image,
        status=status_str,
        scraped_at=scraped_at_str
    )


class HackathonService:
    """
    Repository/Service module handling read queries and pagination for hackathon events.
    """

    @staticmethod
    async def list_hackathons(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        sources: Optional[List[str]] = None,
        mode: Optional[str] = None,
        city: Optional[str] = None,
        status_filter: Optional[str] = None,
        min_prize: Optional[float] = None,
        sort: Optional[str] = "newest"
    ) -> HackathonListResponse:
        """
        Retrieves a paginated list of hackathons with optional filters and sorting.
        """
        query = select(HackathonEvent)
        count_query = select(func.count(HackathonEvent.id))

        # Filter by source list
        if sources:
            clean_sources = [s.strip().lower() for s in sources if s.strip()]
            if clean_sources:
                query = query.where(func.lower(HackathonEvent.source).in_(clean_sources))
                count_query = count_query.where(func.lower(HackathonEvent.source).in_(clean_sources))

        # Filter by mode
        if mode and mode.strip():
            m_val = mode.strip().lower()
            query = query.where(func.lower(HackathonEvent.mode) == m_val)
            count_query = count_query.where(func.lower(HackathonEvent.mode) == m_val)

        # Filter by city
        if city and city.strip():
            c_pattern = f"%{city.strip()}%"
            cond = or_(
                func.lower(HackathonEvent.city) == city.strip().lower(),
                HackathonEvent.location.ilike(c_pattern)
            )
            query = query.where(cond)
            count_query = count_query.where(cond)

        # Filter by derived status
        if status_filter and status_filter.strip():
            st = status_filter.strip().lower()
            now_iso = datetime.now(timezone.utc).isoformat()
            if st == "upcoming":
                cond = HackathonEvent.event_start_date > now_iso
                query = query.where(cond)
                count_query = count_query.where(cond)
            elif st == "closed":
                cond = or_(
                    HackathonEvent.registration_deadline < now_iso,
                    HackathonEvent.event_end_date < now_iso
                )
                query = query.where(cond)
                count_query = count_query.where(cond)
            elif st == "open":
                cond = and_(
                    or_(HackathonEvent.registration_deadline.is_(None), HackathonEvent.registration_deadline >= now_iso),
                    or_(HackathonEvent.event_end_date.is_(None), HackathonEvent.event_end_date >= now_iso)
                )
                query = query.where(cond)
                count_query = count_query.where(cond)

        # Filter by minimum prize keyword if provided
        if min_prize is not None and min_prize > 0:
            cond = HackathonEvent.prize_pool.is_not(None)
            query = query.where(cond)
            count_query = count_query.where(cond)

        # Sorting
        if sort == "deadline_asc":
            query = query.order_by(HackathonEvent.registration_deadline.asc().nulls_last(), HackathonEvent.id.desc())
        elif sort == "prize_desc":
            query = query.order_by(HackathonEvent.prize_pool.desc().nulls_last(), HackathonEvent.id.desc())
        elif sort == "start_asc":
            query = query.order_by(HackathonEvent.event_start_date.asc().nulls_last(), HackathonEvent.id.desc())
        else:  # "newest" / default
            query = query.order_by(HackathonEvent.scraped_at.desc(), HackathonEvent.id.desc())

        # Pagination calculations
        total = (await db.execute(count_query)).scalar_one()
        offset = (page - 1) * page_size
        records = (await db.execute(query.offset(offset).limit(page_size))).scalars().all()

        items = [_to_response_model(r) for r in records]
        has_next = (offset + len(records)) < total

        return HackathonListResponse(
            events=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=has_next
        )

    @staticmethod
    async def get_hackathon_by_id(db: AsyncSession, identifier: str) -> Optional[HackathonEventResponse]:
        """
        Fetches single event detail by integer primary key ID or external_id string.
        """
        query = select(HackathonEvent)
        if identifier.isdigit():
            query = query.where(or_(HackathonEvent.id == int(identifier), HackathonEvent.external_id == identifier))
        else:
            query = query.where(HackathonEvent.external_id == identifier)

        record = (await db.execute(query)).scalars().first()
        if not record:
            return None
        return _to_response_model(record)

    @staticmethod
    async def search_hackathons(
        db: AsyncSession,
        q: str,
        page: int = 1,
        page_size: int = 20
    ) -> HackathonListResponse:
        """
        Full-text ILIKE search across title, description, and organizer fields.
        """
        pattern = f"%{q.strip()}%"
        condition = or_(
            HackathonEvent.title.ilike(pattern),
            HackathonEvent.description.ilike(pattern),
            HackathonEvent.organizer.ilike(pattern)
        )

        query = select(HackathonEvent).where(condition)
        count_query = select(func.count(HackathonEvent.id)).where(condition)

        total = (await db.execute(count_query)).scalar_one()
        offset = (page - 1) * page_size
        records = (await db.execute(query.order_by(HackathonEvent.scraped_at.desc()).offset(offset).limit(page_size))).scalars().all()

        items = [_to_response_model(r) for r in records]
        has_next = (offset + len(records)) < total

        return HackathonListResponse(
            events=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=has_next
        )

    @staticmethod
    async def get_upcoming_hackathons(
        db: AsyncSession,
        page: int = 1,
        page_size: int = 20
    ) -> HackathonListResponse:
        """
        Retrieves events with event_start_date in the future, sorted soonest-first.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        condition = and_(
            HackathonEvent.event_start_date.is_not(None),
            HackathonEvent.event_start_date >= now_iso
        )

        query = select(HackathonEvent).where(condition).order_by(HackathonEvent.event_start_date.asc())
        count_query = select(func.count(HackathonEvent.id)).where(condition)

        total = (await db.execute(count_query)).scalar_one()
        offset = (page - 1) * page_size
        records = (await db.execute(query.offset(offset).limit(page_size))).scalars().all()

        items = [_to_response_model(r) for r in records]
        has_next = (offset + len(records)) < total

        return HackathonListResponse(
            events=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=has_next
        )
