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

class GreenhouseSource(BaseJobSource):
    """
    Adapter for the Greenhouse Public Job Board REST API.
    Fetches listings from https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
    """
    BASE_URL = "https://boards-api.greenhouse.io/v1/boards"

    def __init__(self, timeout: float = 15.0, client: Optional[httpx.AsyncClient] = None):
        self.timeout = timeout
        self._client = client

    @property
    def source_name(self) -> str:
        return "greenhouse"

    async def fetch_raw_jobs(self, board_identifier: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetches raw job listings from the public Greenhouse API.
        
        Args:
            board_identifier (str): The Greenhouse board token (e.g. 'stripe', 'airbnb', 'canonical').
            
        Returns:
            List[Dict[str, Any]]: List of raw job JSON objects.
        """
        token = (board_identifier or "").strip().lower()
        if not token:
            raise ValueError("Greenhouse board_identifier cannot be empty.")

        url = f"{self.BASE_URL}/{token}/jobs"
        params = {"content": "true"}
        headers = {
            "User-Agent": "CareerPathFinder-JobScraper/1.0",
            "Accept": "application/json",
        }

        # Use injected client if provided (useful for tests/mocking), or create a scoped one
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
            logger.error(f"Greenhouse request timed out for board '{token}': {e}")
            raise SourceHTTPError(f"Request to Greenhouse board '{token}' timed out: {e}") from e
        except httpx.RequestError as e:
            logger.error(f"Network error accessing Greenhouse board '{token}': {e}")
            raise SourceHTTPError(f"Network error connecting to Greenhouse board '{token}': {e}") from e

        # Handle specific HTTP status codes
        if response.status_code == 404:
            logger.warning(f"Greenhouse board '{token}' not found (HTTP 404).")
            raise BoardNotFoundError(f"Greenhouse board token '{token}' was not found.")
        elif response.status_code == 429:
            logger.warning(f"Greenhouse rate limit reached (HTTP 429) for board '{token}'.")
            raise RateLimitError(f"Rate limited by Greenhouse while fetching board '{token}'.")
        elif response.status_code >= 400:
            logger.error(f"Greenhouse HTTP {response.status_code} error for board '{token}': {response.text}")
            raise SourceHTTPError(f"Greenhouse API returned HTTP {response.status_code}: {response.text}")

        return response

    def _parse_api_response(self, response: httpx.Response, token: str) -> List[Dict[str, Any]]:
        """
        Validates JSON structure from Greenhouse API.
        """
        try:
            data = response.json()
        except Exception as e:
            logger.error(f"Failed to parse JSON response from Greenhouse board '{token}': {e}")
            raise MalformedSourceDataError(f"Greenhouse returned non-JSON payload: {e}") from e

        if isinstance(data, dict):
            if "jobs" in data and isinstance(data["jobs"], list):
                return data["jobs"]
            raise MalformedSourceDataError(f"Greenhouse JSON missing expected 'jobs' array key. Keys found: {list(data.keys())}")
        elif isinstance(data, list):
            return data
        else:
            raise MalformedSourceDataError(f"Unexpected Greenhouse root JSON type: {type(data)}")

    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedJob]:
        """
        Extracts, normalizes, and validates a single Greenhouse job item into a ScrapedJob model.
        Returns None if the item is invalid or malformed.
        """
        if not isinstance(raw_data, dict):
            logger.warning(f"Skipping malformed raw job data of type {type(raw_data)}")
            return None

        # 1. Extract external ID
        raw_id = raw_data.get("id")
        if raw_id is None:
            logger.warning("Skipping Greenhouse job with missing 'id'")
            return None
        external_id = str(raw_id).strip()

        # 2. Extract title
        title = raw_data.get("title")
        if not title or not isinstance(title, str) or not title.strip():
            logger.warning(f"Skipping Greenhouse job {external_id} with missing/empty title")
            return None
        cleaned_title = title.strip()

        # 3. Location normalization
        location = normalize_location(raw_data.get("location"))

        # 4. HTML description cleaning
        description = clean_html(raw_data.get("content"))

        # 5. URL
        url = raw_data.get("absolute_url")
        if url and isinstance(url, str):
            url = url.strip()

        # 6. Posted date
        posted_date = normalize_date(raw_data.get("updated_at") or raw_data.get("created_at"))

        # 7. Job type heuristic
        job_type = detect_job_type(title=cleaned_title, description=description)

        # 8. Company name
        resolved_company = company_name.strip() if (company_name and company_name.strip()) else None

        # Construct and validate through model
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
            logger.warning(f"Validation failed for Greenhouse job {external_id}: {err}")
            return None

        return job
