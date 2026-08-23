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


class AshbySource(BaseJobSource):
    """
    Adapter for the Ashby Public Job Board / Job Postings API.
    Fetches job listings from https://api.ashbyhq.com/posting-api/job-board/{jobBoardName}
    """
    BASE_URL = "https://api.ashbyhq.com/posting-api/job-board"

    def __init__(self, timeout: float = 15.0, client: Optional[httpx.AsyncClient] = None):
        self.timeout = timeout
        self._client = client

    @property
    def source_name(self) -> str:
        return "ashby"

    async def fetch_raw_jobs(self, board_identifier: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetches raw job postings for a given Ashby job board identifier.
        
        Args:
            board_identifier (str): The Ashby company job board identifier (e.g. 'sentry', 'linear', 'ramp').
            
        Returns:
            List[Dict[str, Any]]: List of raw job JSON dictionaries from the Ashby API.
        """
        token = (board_identifier or "").strip()
        if not token:
            raise ValueError("Ashby board_identifier cannot be empty.")

        url = f"{self.BASE_URL}/{token}"
        headers = {
            "User-Agent": "CareerPathFinder-JobScraper/1.0 (AshbyAdapter)",
            "Accept": "application/json",
        }

        if self._client is not None:
            response = await self._send_request(self._client, url, headers, token)
        else:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await self._send_request(client, url, headers, token)

        return self._parse_api_response(response, token)

    async def _send_request(
        self,
        client: httpx.AsyncClient,
        url: str,
        headers: Dict[str, str],
        token: str
    ) -> httpx.Response:
        """
        Executes HTTP GET request against Ashby public API with comprehensive error handling.
        """
        try:
            response = await client.get(url, headers=headers)
        except httpx.TimeoutException as e:
            logger.error(f"Ashby API request timed out for board '{token}': {e}")
            raise SourceHTTPError(f"Request to Ashby board '{token}' timed out: {e}") from e
        except httpx.RequestError as e:
            logger.error(f"Network error accessing Ashby API for board '{token}': {e}")
            raise SourceHTTPError(f"Network error connecting to Ashby board '{token}': {e}") from e

        if response.status_code == 404:
            logger.warning(f"Ashby board '{token}' not found (HTTP 404).")
            raise BoardNotFoundError(f"Ashby job board '{token}' was not found.")
        elif response.status_code == 429:
            logger.warning(f"Ashby API rate limit exceeded (HTTP 429) for board '{token}'.")
            raise RateLimitError(f"Rate limited while accessing Ashby board '{token}'.")
        elif response.status_code >= 400:
            logger.error(f"Ashby API HTTP {response.status_code} error for '{token}': {response.text[:200]}")
            raise SourceHTTPError(f"Ashby API returned HTTP {response.status_code}: {response.text[:200]}")

        return response

    def _parse_api_response(self, response: httpx.Response, token: str) -> List[Dict[str, Any]]:
        """
        Validates JSON schema returned by Ashby Job Postings API.
        """
        try:
            data = response.json()
        except Exception as e:
            logger.error(f"Failed to parse JSON response from Ashby board '{token}': {e}")
            raise MalformedSourceDataError(f"Ashby returned non-JSON payload: {e}") from e

        if not isinstance(data, dict):
            raise MalformedSourceDataError(f"Unexpected Ashby root JSON type: {type(data)}")

        jobs = data.get("jobs")
        if jobs is None or not isinstance(jobs, list):
            raise MalformedSourceDataError(f"Ashby JSON missing expected 'jobs' list. Keys: {list(data.keys())}")

        return jobs

    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedJob]:
        """
        Extracts, normalizes, and validates a single Ashby job dictionary into ScrapedJob.
        """
        if not isinstance(raw_data, dict):
            return None

        # 1. External ID (Ashby stable UUID)
        raw_id = raw_data.get("id")
        if raw_id is None:
            logger.warning("Skipping Ashby job with missing 'id'")
            return None
        external_id = str(raw_id).strip()
        if not external_id:
            return None

        # 2. Title
        title = raw_data.get("title")
        if not title or not isinstance(title, str) or not title.strip():
            logger.warning(f"Skipping Ashby job {external_id} with missing/empty title")
            return None
        cleaned_title = title.strip()

        # 3. Location normalization
        raw_loc = raw_data.get("location")
        if not raw_loc:
            postal = raw_data.get("address", {}).get("postalAddress") if isinstance(raw_data.get("address"), dict) else None
            if postal and isinstance(postal, dict):
                loc_parts = [postal.get("addressLocality"), postal.get("addressRegion"), postal.get("addressCountry")]
                raw_loc = ", ".join(p for p in loc_parts if p)

        if not raw_loc and raw_data.get("isRemote") is True:
            raw_loc = "Remote"

        location = normalize_location(raw_loc)

        # 4. Description HTML / Plain Text cleaning
        desc_raw = raw_data.get("descriptionHtml") or raw_data.get("descriptionPlain")
        description = clean_html(desc_raw)

        # 5. Job URL
        canonical_url = raw_data.get("jobUrl") or raw_data.get("applyUrl")

        # 6. Posted Date
        posted_date = normalize_date(raw_data.get("publishedAt"))

        # 7. Job Type Detection (maps employmentType, e.g. FullTime, PartTime, Intern, Contract)
        explicit_type = raw_data.get("employmentType")
        job_type = detect_job_type(
            title=cleaned_title,
            description=description,
            explicit_type=explicit_type
        )

        resolved_company = company_name.strip() if (company_name and company_name.strip()) else None

        payload = {
            "external_id": external_id,
            "source": self.source_name,
            "title": cleaned_title,
            "company": resolved_company,
            "location": location,
            "job_type": job_type,
            "description": description,
            "url": canonical_url,
            "posted_date": posted_date,
        }

        job, err = construct_and_validate_job(payload)
        if err:
            logger.warning(f"Validation failed for Ashby job {external_id}: {err}")
            return None

        return job
