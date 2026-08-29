from typing import Optional, List, Any, Dict, Annotated, Union, Literal
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict

class BaseScrapedJob(BaseModel):
    external_id: str = Field(..., description="Unique job identifier from the source board")
    source: str = Field(..., description="Source name/adapter (e.g. 'greenhouse')")
    title: str = Field(..., description="Job title")
    model_config = ConfigDict(extra="ignore")

class AshbyScrapedJob(BaseScrapedJob):
    type: Literal["ashby"] = "ashby"
    company: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = "unknown"
    description: Optional[str] = None
    url: Optional[str] = None
    posted_date: Optional[str] = None

class GreenhouseScrapedJob(BaseScrapedJob):
    type: Literal["greenhouse"] = "greenhouse"
    department: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = "unknown"
    description: Optional[str] = None
    url: Optional[str] = None
    posted_date: Optional[str] = None

class GenericScrapedJob(BaseScrapedJob):
    type: Literal["generic"] = "generic"
    company: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = "unknown"
    description: Optional[str] = None
    url: Optional[str] = None
    posted_date: Optional[str] = None
    raw_payload: Dict[str, Any] = Field(default_factory=dict)

JobSchema = Annotated[
    Union[AshbyScrapedJob, GreenhouseScrapedJob, GenericScrapedJob],
    Field(discriminator="type")
]

class ScrapedJob(BaseModel):
    """
    Standardized, source-agnostic normalized job record.
    Represents the output contract of the scraping pipeline.
    """
    job_data: JobSchema
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
