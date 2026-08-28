from typing import Optional, List, Any, Dict
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict, field_validator


class ScrapedEvent(BaseModel):
    """
    Standardized, source-agnostic normalized hackathon/event record.
    Represents the output contract of the event scraping pipeline.
    """
    external_id: str = Field(..., description="Unique event identifier from the source board")
    source: str = Field(..., description="Source name/adapter (e.g. 'devfolio', 'unstop')")
    title: str = Field(..., description="Event/Hackathon title")
    organizer: Optional[str] = Field(default=None, description="Hosting organization or platform partner")
    description: Optional[str] = Field(default=None, description="Cleaned, plain-text event description")
    url: Optional[str] = Field(default=None, description="Event or application URL")
    location: Optional[str] = Field(default=None, description="Raw event location string")
    city: Optional[str] = Field(default=None, description="Normalized city name")
    state: Optional[str] = Field(default=None, description="Normalized state/region name")
    country: Optional[str] = Field(default=None, description="Normalized country name")
    mode: Optional[str] = Field(default="online", description="Participation mode: online, onsite, or hybrid")
    prize_pool: Optional[str] = Field(default=None, description="Formatted cash or non-cash prize pool")
    registration_deadline: Optional[str] = Field(default=None, description="ISO-8601 registration closing deadline")
    event_start_date: Optional[str] = Field(default=None, description="ISO-8601 event start timestamp")
    event_end_date: Optional[str] = Field(default=None, description="ISO-8601 event end timestamp")
    skills: List[str] = Field(default_factory=list, description="Relevant tech stacks, tags, or categories")
    cover_image: Optional[str] = Field(default=None, description="Banner or thumbnail image URL")
    scraped_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO-8601 timestamp when the record was extracted"
    )

    @field_validator("registration_deadline", "event_start_date", "event_end_date")
    @classmethod
    def validate_iso_date(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        v_str = v.strip()
        try:
            clean_str = v_str.replace("Z", "+00:00")
            datetime.fromisoformat(clean_str)
            return v_str
        except Exception:
            raise ValueError(f"Invalid ISO-8601 timestamp format: '{v_str}'")

    model_config = ConfigDict(extra="ignore")


class EventScrapeResult(BaseModel):
    """
    Container for the execution output of an event scraping run.
    """
    source: str
    board_identifier: str
    total_fetched: int = 0
    total_valid: int = 0
    total_deduplicated: int = 0
    total_loaded: int = 0
    total_inserted: int = 0
    total_updated: int = 0
    events: List[ScrapedEvent] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    model_config = ConfigDict(extra="ignore")
