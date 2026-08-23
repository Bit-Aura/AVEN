import logging
from typing import List, Dict, Any, Optional
import httpx

from .base import (
    BaseJobSource,
    BoardNotFoundError,
    RateLimitError,
    SourceHTTPError,
    MalformedSourceDataError,
)
from ..models import ScrapedJob
from ..normalizer import clean_html, detect_job_type, normalize_location, normalize_date
from ..validator import construct_and_validate_job

logger = logging.getLogger(__name__)

class LeverSource(BaseJobSource):
    """
    Adapter for the Lever Public Job Postings API.
    Fetches listings from https://api.lever.co/v0/postings/{site}?mode=json
    """
    BASE_URL = "https://api.lever.co/v0/postings"

    def __init__(self, timeout: float = 15.0, client: Optional[httpx.AsyncClient] = None):
        self.timeout = timeout
        self._client = client

    @property
    def source_name(self) -> str:
        return "lever"

    async def fetch_raw_jobs(self, board_identifier: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetches raw job listings from the public Lever API.
        
        Args:
            board_identifier (str): The Lever site slug / company identifier (e.g. 'palantir', 'benchling').
            
        Returns:
            List[Dict[str, Any]]: List of raw job JSON objects.
        """
        token = (board_identifier or "").strip().lower()
        if not token:
            raise ValueError("Lever board_identifier cannot be empty.")

        url = f"{self.BASE_URL}/{token}"
        params = {"mode": "json"}
        headers = {
            "User-Agent": "CareerPathFinder-JobScraper/1.0",
            "Accept": "application/json",
        }

        if self._client is not None:
            response = await self._send_request(self._client, url, params, headers, token)
        else:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await self._send_request(client, url, params, headers, token)

        return self._parse_api_response(response, token)

    async def _send_request(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: Dict[str, str],
        headers: Dict[str, str],
        token: str
    ) -> httpx.Response:
        """
        Executes HTTP GET request with standard error handling.
        """
        try:
            response = await client.get(url, params=params, headers=headers)
        except httpx.TimeoutException as e:
            logger.error(f"Lever request timed out for site '{token}': {e}")
            raise SourceHTTPError(f"Request to Lever site '{token}' timed out: {e}") from e
        except httpx.RequestError as e:
            logger.error(f"Network error accessing Lever site '{token}': {e}")
            raise SourceHTTPError(f"Network error connecting to Lever site '{token}': {e}") from e

        # Handle HTTP status codes
        if response.status_code == 404:
            logger.warning(f"Lever site '{token}' not found (HTTP 404).")
            raise BoardNotFoundError(f"Lever site '{token}' was not found.")
        elif response.status_code == 429:
            logger.warning(f"Lever rate limit reached (HTTP 429) for site '{token}'.")
            raise RateLimitError(f"Rate limited by Lever while fetching site '{token}'.")
        elif response.status_code >= 400:
            logger.error(f"Lever HTTP {response.status_code} error for site '{token}': {response.text}")
            raise SourceHTTPError(f"Lever API returned HTTP {response.status_code}: {response.text}")

        return response

    def _parse_api_response(self, response: httpx.Response, token: str) -> List[Dict[str, Any]]:
        """
        Validates JSON structure from Lever API.
        Lever returns a top-level JSON array of posting objects.
        """
        try:
            data = response.json()
        except Exception as e:
            logger.error(f"Failed to parse JSON response from Lever site '{token}': {e}")
            raise MalformedSourceDataError(f"Lever returned non-JSON payload: {e}") from e

        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            # Fallback if wrapped in a dictionary key
            for key in ("postings", "jobs", "data"):
                if key in data and isinstance(data[key], list):
                    return data[key]
            raise MalformedSourceDataError(f"Lever JSON dictionary missing expected job array. Keys found: {list(data.keys())}")
        else:
            raise MalformedSourceDataError(f"Unexpected Lever root JSON type: {type(data)}")

    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedJob]:
        """
        Extracts, normalizes, and validates a single Lever job item into a ScrapedJob model.
        Returns None if the item is invalid or malformed.
        """
        if not isinstance(raw_data, dict):
            logger.warning(f"Skipping malformed raw job data of type {type(raw_data)}")
            return None

        # 1. Extract external ID
        raw_id = raw_data.get("id")
        if raw_id is None:
            logger.warning("Skipping Lever job with missing 'id'")
            return None
        external_id = str(raw_id).strip()
        if not external_id:
            logger.warning("Skipping Lever job with empty 'id'")
            return None

        # 2. Extract title (Lever uses 'text' or 'title')
        title = raw_data.get("text") or raw_data.get("title")
        if not title or not isinstance(title, str) or not title.strip():
            logger.warning(f"Skipping Lever job {external_id} with missing/empty title")
            return None
        cleaned_title = title.strip()

        # 3. Location normalization
        categories = raw_data.get("categories")
        location_raw = None
        commitment_raw = None
        if isinstance(categories, dict):
            location_raw = categories.get("location")
            commitment_raw = categories.get("commitment")
            if not location_raw and "allLocations" in categories and isinstance(categories["allLocations"], list):
                if categories["allLocations"]:
                    location_raw = ", ".join(str(loc) for loc in categories["allLocations"] if loc)

        if not location_raw and raw_data.get("workplaceType"):
            location_raw = str(raw_data.get("workplaceType"))

        location = normalize_location(location_raw)

        # 4. Description extraction & HTML cleaning
        description = None
        # Prefer structured descriptionPlain if clean, else clean HTML from description/descriptionBody
        raw_desc = (
            raw_data.get("descriptionPlain")
            or raw_data.get("descriptionBodyPlain")
            or raw_data.get("description")
            or raw_data.get("descriptionBody")
            or raw_data.get("openingPlain")
            or raw_data.get("opening")
        )
        if raw_desc:
            description = clean_html(raw_desc)

        # If lists are present (e.g. responsibilities, requirements), assemble if description is sparse
        lists_data = raw_data.get("lists")
        if isinstance(lists_data, list) and lists_data:
            list_parts = []
            for item in lists_data:
                if isinstance(item, dict):
                    header = item.get("text") or ""
                    content_raw = item.get("content") or ""
                    cleaned_content = clean_html(content_raw)
                    if header and cleaned_content:
                        list_parts.append(f"{header.strip()}:\n{cleaned_content}")
                    elif cleaned_content:
                        list_parts.append(cleaned_content)
            if list_parts:
                extra_text = "\n\n".join(list_parts)
                description = f"{description}\n\n{extra_text}".strip() if description else extra_text

        # 5. URL (Lever provides hostedUrl or applyUrl)
        url = raw_data.get("hostedUrl") or raw_data.get("applyUrl")
        if url and isinstance(url, str):
            url = url.strip()

        # 6. Posted date (Lever provides createdAt integer timestamp in milliseconds)
        posted_date = normalize_date(raw_data.get("createdAt"))

        # 7. Job type detection (using explicit commitment if available)
        job_type = detect_job_type(
            title=cleaned_title,
            description=description,
            explicit_type=commitment_raw
        )

        # 8. Company name (never guess from site slug)
        resolved_company = company_name.strip() if (company_name and company_name.strip()) else None

        payload = {
            "external_id": external_id,
            "source": self.source_name,
            "title": cleaned_title,
            "company": resolved_company,
            "location": location,
            "job_type": job_type,
            "description": description,
            "url": url,
            "posted_date": posted_date,
        }

        job, err = construct_and_validate_job(payload)
        if err:
            logger.warning(f"Validation failed for Lever job {external_id}: {err}")
            return None

        return job
