from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict


class HackathonEventResponse(BaseModel):
    """
    Public/Learner-facing response model for a single hackathon/event record.
    Excludes internal scraper debugging metadata while exposing clean normalized fields.
    """
    id: int
    external_id: str
    source: str
    title: str
    organizer: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    mode: Optional[str] = "online"
    prize_pool: Optional[str] = None
    registration_deadline: Optional[str] = None
    event_start_date: Optional[str] = None
    event_end_date: Optional[str] = None
    skills: List[str] = []
    cover_image: Optional[str] = None
    status: str = "open"  # Derived field: 'open', 'upcoming', or 'closed'
    scraped_at: str

    model_config = ConfigDict(from_attributes=True, extra="ignore")


class HackathonListResponse(BaseModel):
    """
    Paginated envelope response model for hackathon listing endpoints.
    Matches AVEN's standard API response envelope structure.
    """
    events: List[HackathonEventResponse]
    total: int
    page: int
    page_size: int
    has_next: bool

    model_config = ConfigDict(extra="ignore")
