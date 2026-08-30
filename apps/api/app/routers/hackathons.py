import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.auth import require_active_user, require_admin, User
from app.services.hackathon_service import HackathonService
from app.schemas.hackathon_schemas import HackathonEventResponse, HackathonListResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/hackathons", tags=["Hackathons"])


@router.get("", response_model=HackathonListResponse)
async def list_hackathons_endpoint(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    source: Optional[List[str]] = Query(None, description="Filter by event source platform (repeatable)"),
    mode: Optional[str] = Query(None, description="Filter by mode (online, onsite, hybrid)"),
    city: Optional[str] = Query(None, description="Filter by city name"),
    status: Optional[str] = Query(None, description="Filter by event status (open, upcoming, closed)"),
    min_prize: Optional[float] = Query(None, description="Minimum prize threshold"),
    sort: Optional[str] = Query("newest", description="Sorting criteria (newest, deadline_asc, prize_desc, start_asc)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_active_user)
):
    """
    Retrieves a paginated list of hackathons and tech events.
    Supports multi-source filtering, mode, city, status derivation, and sorting.
    Accessible to all active authenticated users.
    """
    return await HackathonService.list_hackathons(
        db=db,
        page=page,
        page_size=page_size,
        sources=source,
        mode=mode,
        city=city,
        status_filter=status,
        min_prize=min_prize,
        sort=sort
    )


@router.get("/sources")
async def get_hackathon_sources_endpoint(
    current_user: User = Depends(require_active_user)
):
    """
    Returns available hackathon scraper source adapters and descriptions.
    Accessible to all active authenticated users.
    """
    return {
        "sources": [
            {"id": "devfolio", "name": "Devfolio", "description": "Devfolio hackathons search API"},
            {"id": "devpost", "name": "Devpost", "description": "Devpost hackathons REST API"},
            {"id": "hack2skill", "name": "Hack2Skill", "description": "Hack2Skill public event listings & details"},
            {"id": "hackerearth", "name": "HackerEarth", "description": "HackerEarth Chrome extension challenges feed"},
            {"id": "hackquest", "name": "HackQuest", "description": "HackQuest Web3/Tech hackathons"},
            {"id": "lablab", "name": "LabLab.ai", "description": "LabLab AI hackathons & script payloads"},
            {"id": "mlh", "name": "Major League Hacking (MLH)", "description": "MLH collegiate season events"},
            {"id": "unstop", "name": "Unstop", "description": "Unstop public opportunities API"},
            {"id": "whereuelevate", "name": "Where U Elevate", "description": "Where U Elevate hackathons & drills"},
            {"id": "hackculture", "name": "HackCulture", "description": "Stub adapter for HackCulture"}
        ]
    }


@router.get("/search", response_model=HackathonListResponse)
async def search_hackathons_endpoint(
    q: str = Query(..., min_length=1, description="Search query string"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_active_user)
):
    """
    Full-text search across hackathon title, description, and organizer fields.
    Accelerated by PostgreSQL trigram (pg_trgm) GIN index.
    Accessible to all active authenticated users.
    """
    return await HackathonService.search_hackathons(db=db, q=q, page=page, page_size=page_size)


@router.get("/upcoming", response_model=HackathonListResponse)
async def get_upcoming_hackathons_endpoint(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_active_user)
):
    """
    Returns events with event_start_date in the future, sorted soonest-first.
    Accessible to all active authenticated users.
    """
    return await HackathonService.get_upcoming_hackathons(db=db, page=page, page_size=page_size)


class ScrapeEventsInput(BaseModel):
    source: str
    board_token: Optional[str] = "all"
    company_name: Optional[str] = None
    limit: Optional[int] = None


@router.post("/scrape")
async def scrape_hackathons_endpoint(
    data: ScrapeEventsInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Executes the standalone event scraping pipeline to fetch, clean, normalize,
    deduplicate, and persist hackathons and tech events.
    Strictly restricted to PLATFORM ADMIN users.
    """
    from app.scraper.event_pipeline import EventScrapingPipeline

    pipeline = EventScrapingPipeline()
    try:
        result = await pipeline.scrape_source(
            source_name=data.source,
            board_identifier=data.board_token or "all",
            company_name=data.company_name,
            db=db
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if data.limit and data.limit > 0:
        result.events = result.events[:data.limit]
        result.total_deduplicated = len(result.events)

    return result


@router.get("/{id}", response_model=HackathonEventResponse)
async def get_hackathon_detail_endpoint(
    id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_active_user)
):
    """
    Retrieves detailed event record by integer ID or external_id string.
    Accessible to all active authenticated users.
    """
    event = await HackathonService.get_hackathon_by_id(db=db, identifier=id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hackathon event with ID '{id}' not found."
        )
    return event
