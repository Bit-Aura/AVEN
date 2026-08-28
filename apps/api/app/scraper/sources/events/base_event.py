from abc import ABC, abstractmethod
import asyncio
from datetime import datetime
import html
import logging
import re
import unicodedata
from typing import List, Dict, Any, Optional, Tuple
import httpx

from app.scraper.models_events import ScrapedEvent

logger = logging.getLogger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
}

# Lookup table mappings for state/city abbreviations
LOCATION_LOOKUP = {
    "cbe": {"city": "Coimbatore", "country": "India"},
    "coimbatore": {"city": "Coimbatore", "country": "India"},
    "tn": {"state": "Tamil Nadu", "country": "India"},
    "tamil nadu": {"state": "Tamil Nadu", "country": "India"},
    "blr": {"city": "Bengaluru", "country": "India"},
    "bengaluru": {"city": "Bengaluru", "country": "India"},
    "bangalore": {"city": "Bengaluru", "country": "India"},
    "hyd": {"city": "Hyderabad", "country": "India"},
    "hyderabad": {"city": "Hyderabad", "country": "India"},
    "sf": {"city": "San Francisco", "state": "CA", "country": "USA"},
    "nyc": {"city": "New York", "state": "NY", "country": "USA"},
    "ma": {"state": "MA", "country": "USA"},
    "ca": {"state": "CA", "country": "USA"},
    "ny": {"state": "NY", "country": "USA"},
    "uk": {"country": "United Kingdom"},
    "usa": {"country": "USA"},
    "us": {"country": "USA"},
}


class EventScraperException(Exception):
    """Base exception for event scraping errors."""
    pass


class EventSourceHTTPError(EventScraperException):
    """Raised on upstream HTTP or network failures during event scraping."""
    pass


class BaseEventSource(ABC):
    """
    Standalone Abstract Base Class for all hackathon and event source adapters.
    Has zero dependency on the job scraper class hierarchy.
    """

    def __init__(self, request_delay_seconds: float = 0.5, timeout_seconds: float = 30.0):
        self.request_delay_seconds = request_delay_seconds
        self.timeout_seconds = timeout_seconds

    @property
    @abstractmethod
    def source_name(self) -> str:
        """The canonical identifier for this event source adapter (e.g. 'devfolio')."""
        pass

    @abstractmethod
    async def fetch_raw_jobs(self, board_identifier: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetches raw event listing dictionaries from the external source.
        """
        pass

    @abstractmethod
    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedEvent]:
        """
        Extracts, normalizes, and validates a single event entry from raw source data.
        """
        pass

    async def _sleep(self, seconds: Optional[float] = None) -> None:
        delay = seconds if seconds is not None else self.request_delay_seconds
        if delay > 0:
            await asyncio.sleep(delay)

    async def _make_request(
        self,
        url: str,
        method: str = "GET",
        headers: Optional[Dict[str, str]] = None,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        follow_redirects: bool = True
    ) -> httpx.Response:
        req_headers = {**DEFAULT_HEADERS, **(headers or {})}
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds, follow_redirects=follow_redirects) as client:
                if method.upper() == "POST":
                    response = await client.post(url, headers=req_headers, params=params, json=json_data)
                else:
                    response = await client.get(url, headers=req_headers, params=params)
                response.raise_for_status()
                return response
        except httpx.HTTPStatusError as e:
            logger.error(f"[{self.source_name}] HTTP error {e.response.status_code} requesting {url}")
            raise EventSourceHTTPError(f"HTTP status error {e.response.status_code} for {url}") from e
        except httpx.RequestError as e:
            logger.error(f"[{self.source_name}] Network error requesting {url}: {e}")
            raise EventSourceHTTPError(f"Network error connecting to {url}: {e}") from e

    @staticmethod
    def clean_html(raw_html: Optional[str]) -> str:
        """
        Strips HTML tags, decodes HTML entities, and normalizes unicode / whitespace.
        """
        if not raw_html:
            return ""
        # Decode HTML entities (&amp;, &nbsp;, etc.)
        decoded = html.unescape(raw_html)
        # Strip HTML tags
        clean_text = re.sub(r"<[^>]*>", " ", decoded)
        # Unicode normalization (NFKC)
        normalized = unicodedata.normalize("NFKC", clean_text)
        # Collapse whitespace
        clean_text = re.sub(r"\s+", " ", normalized)
        return clean_text.strip()

    @staticmethod
    def parse_single_date(date_str: str) -> Optional[str]:
        """
        Parses a single date string into ISO-8601 format. Returns None on parse failure.
        """
        if not date_str or not isinstance(date_str, str):
            return None
        date_str = date_str.strip()
        if not date_str or date_str.lower() in ("tbd", "n/a", "none"):
            return None
        try:
            clean_str = date_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_str)
            return dt.isoformat()
        except Exception:
            for fmt in (
                "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y", "%Y/%m/%d",
                "%b %d, %Y", "%B %d, %Y", "%d %b %Y", "%d %B %Y",
                "%b %d %Y", "%B %d %Y"
            ):
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt.isoformat()
                except Exception:
                    continue
            return None

    @classmethod
    def parse_date_range(cls, date_str: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
        """
        Parses single dates or date range strings (e.g. 'Aug 12 - Aug 15, 2026') into (start_iso, end_iso).
        On genuine total failure, returns (None, None).
        """
        if not date_str or not isinstance(date_str, str):
            return (None, None)
        date_str = date_str.strip()
        if not date_str or date_str.lower() in ("tbd", "n/a", "none"):
            return (None, None)

        # Check for range separators (' - ', ' to ', ' – ')
        range_match = re.split(r"\s+(?:-|to|–)\s+|\s*–\s*", date_str, maxsplit=1, flags=re.IGNORECASE)
        if len(range_match) == 2:
            part1, part2 = range_match[0].strip(), range_match[1].strip()
            
            # If part1 missing year but part2 has year (e.g., 'Aug 12' and 'Aug 15, 2026')
            year_match = re.search(r"\b(20\d{2})\b", part2)
            if year_match and not re.search(r"\b(20\d{2})\b", part1):
                part1 = f"{part1}, {year_match.group(1)}"

            start_iso = cls.parse_single_date(part1)
            end_iso = cls.parse_single_date(part2)
            return (start_iso, end_iso)
        else:
            single_iso = cls.parse_single_date(date_str)
            return (single_iso, None)

    @classmethod
    def parse_iso_date(cls, date_str: Optional[str]) -> Optional[str]:
        """
        Legacy single-date parser wrapper. Returns valid ISO 8601 string or None on failure.
        """
        start_iso, _ = cls.parse_date_range(date_str)
        return start_iso

    @staticmethod
    def normalize_location(raw_loc: Optional[str]) -> Dict[str, Optional[str]]:
        """
        Splits and maps raw location strings into structured city, state, country, and mode fields.
        """
        result = {"city": None, "state": None, "country": None, "mode": None}
        if not raw_loc or not isinstance(raw_loc, str):
            return result

        clean_loc = raw_loc.strip()
        loc_lower = clean_loc.lower()

        if any(kw in loc_lower for kw in ("online", "virtual", "remote")):
            result["mode"] = "online"
            return result

        # Split by comma or slash
        parts = [p.strip() for p in re.split(r"[,/]", clean_loc) if p.strip()]
        
        city = None
        state = None
        country = None

        if len(parts) == 1:
            part_lower = parts[0].lower()
            if part_lower in LOCATION_LOOKUP:
                lookup = LOCATION_LOOKUP[part_lower]
                city = lookup.get("city")
                state = lookup.get("state")
                country = lookup.get("country")
            elif part_lower in ("india", "usa", "us", "uk", "united states", "canada"):
                country = parts[0]
            else:
                city = parts[0]
        elif len(parts) == 2:
            p1_lower = parts[0].lower()
            p2_lower = parts[1].lower()
            city = parts[0]
            
            if p2_lower in LOCATION_LOOKUP:
                lookup = LOCATION_LOOKUP[p2_lower]
                state = lookup.get("state") or (parts[1] if len(parts[1]) == 2 else None)
                country = lookup.get("country")
            else:
                country = parts[1]
        elif len(parts) >= 3:
            city = parts[0]
            p2_lower = parts[1].lower()
            state = LOCATION_LOOKUP.get(p2_lower, {}).get("state") or parts[1]
            p3_lower = parts[2].lower()
            country = LOCATION_LOOKUP.get(p3_lower, {}).get("country") or parts[2]

        result["city"] = city
        result["state"] = state
        result["country"] = country
        return result
