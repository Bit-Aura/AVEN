from typing import Optional, List, Any, Dict
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict

class ScrapedJob(BaseModel):
    """
    Standardized, source-agnostic normalized job record.
    Represents the output contract of the scraping pipeline.
    """
    external_id: str = Field(..., description="Unique job identifier from the source board (e.g. Greenhouse ID)")
    source: str = Field(..., description="Source name/adapter (e.g. 'greenhouse')")
    title: str = Field(..., description="Job title")
    company: Optional[str] = Field(default=None, description="Hiring company name if determinable")
    location: Optional[str] = Field(default=None, description="Normalized job location or remote indicator")
    job_type: Optional[str] = Field(default="unknown", description="Employment type: full_time, part_time, contract, internship, temporary, unknown")
    description: Optional[str] = Field(default=None, description="Cleaned, plain-text job description")
    url: Optional[str] = Field(default=None, description="Application or job posting URL")
    posted_date: Optional[str] = Field(default=None, description="ISO-8601 formatted publication timestamp")
    scraped_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO-8601 timestamp when the record was extracted"
    )

    model_config = ConfigDict(extra="ignore")


class ScrapeResult(BaseModel):
    """
    Container for the execution output of a scraping run.
    """
    source: str
    board_identifier: str
    total_fetched: int = 0
    total_valid: int = 0
    total_deduplicated: int = 0
    jobs: List[ScrapedJob] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    model_config = ConfigDict(extra="ignore")
