from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from ..models import ScrapedJob

class ScraperException(Exception):
    """Base exception for scraping errors."""
    pass

class BoardNotFoundError(ScraperException):
    """Raised when a job board token or endpoint returns HTTP 404."""
    pass

class RateLimitError(ScraperException):
    """Raised when request is throttled with HTTP 429."""
    pass

class SourceHTTPError(ScraperException):
    """Raised on upstream 5xx or unexpected network HTTP failures."""
    pass

class MalformedSourceDataError(ScraperException):
    """Raised when the source API response format differs from expected structure."""
    pass


class BaseJobSource(ABC):
    """
    Abstract Base Class for all external job board and ATS source adapters.
    """
    @property
    @abstractmethod
    def source_name(self) -> str:
        """The canonical identifier for this source adapter (e.g. 'greenhouse')."""
        pass

    @abstractmethod
    async def fetch_raw_jobs(self, board_identifier: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetches raw job listing dictionaries from the external source.
        """
        pass

    @abstractmethod
    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedJob]:
        """
        Extracts, normalizes, and validates a single job entry from raw source data.
        """
        pass
