import logging
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin
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

class AmazonJobsSource(BaseJobSource):
    """
    Adapter for the Amazon Jobs Public Search REST API.
    Fetches listings from https://www.amazon.jobs/en/search.json
    Supports search query parameters and multi-page pagination.
    """
    BASE_URL = "https://www.amazon.jobs/en/search.json"

    def __init__(self, timeout: float = 15.0, client: Optional[httpx.AsyncClient] = None):
        self.timeout = timeout
        self._client = client

    @property
    def source_name(self) -> str:
        return "amazon"

    async def fetch_raw_jobs(
        self,
        board_identifier: str = "software-development",
        query: Optional[str] = None,
        category: Optional[str] = None,
        result_limit: int = 10,
        max_pages: int = 1,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Fetches raw job listings from the Amazon Jobs public endpoint.
        
        Args:
            board_identifier (str): Default category slug or search term (e.g. 'software-development').
            query (Optional[str]): Text search query (e.g. 'machine learning').
            category (Optional[str]): Category filter. Defaults to board_identifier if not overridden.
            result_limit (int): Number of jobs per page (default: 10, max: 100).
            max_pages (int): Number of pages to retrieve (default: 1).
            
        Returns:
            List[Dict[str, Any]]: List of raw job JSON objects.
        """
        resolved_category = category or (board_identifier if board_identifier != "amazon" else "software-development")
        
        headers = {
            "User-Agent": "CareerPathFinder-JobScraper/1.0 (AmazonAdapter)",
            "Accept": "application/json, text/plain, */*",
        }

        all_jobs: List[Dict[str, Any]] = []
        limit = max(1, min(result_limit, 100))
        pages_to_fetch = max(1, max_pages)

        if self._client is not None:
            all_jobs = await self._fetch_pages(self._client, resolved_category, query, limit, pages_to_fetch, headers)
        else:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                all_jobs = await self._fetch_pages(client, resolved_category, query, limit, pages_to_fetch, headers)

        return all_jobs

    async def _fetch_pages(
        self,
        client: httpx.AsyncClient,
        category: Optional[str],
        query: Optional[str],
        limit: int,
        pages_to_fetch: int,
        headers: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """
        Executes paginated requests using offset and result_limit.
        """
        collected_jobs: List[Dict[str, Any]] = []

        for page in range(pages_to_fetch):
            offset = page * limit
            params: Dict[str, Any] = {
                "result_limit": limit,
                "offset": offset,
            }
            if category:
                params["category[]"] = category
            if query:
                params["search_text"] = query

            response = await self._send_request(client, self.BASE_URL, params, headers)
            page_jobs, total_hits = self._parse_api_response(response)
            
            if not page_jobs:
                break

            collected_jobs.extend(page_jobs)

            # Stop if we have fetched all available hits
            if len(collected_jobs) >= total_hits:
                break

        return collected_jobs

    async def _send_request(
        self,
        client: httpx.AsyncClient,
        url: str,
        params: Dict[str, Any],
        headers: Dict[str, str]
    ) -> httpx.Response:
        """
        Executes HTTP GET request with standard error handling.
        """
        try:
            response = await client.get(url, params=params, headers=headers)
        except httpx.TimeoutException as e:
            logger.error(f"Amazon request timed out: {e}")
            raise SourceHTTPError(f"Request to Amazon Jobs timed out: {e}") from e
        except httpx.RequestError as e:
            logger.error(f"Network error accessing Amazon Jobs: {e}")
            raise SourceHTTPError(f"Network error connecting to Amazon Jobs: {e}") from e

        if response.status_code == 404:
            logger.warning("Amazon Jobs endpoint returned 404.")
            raise BoardNotFoundError("Amazon Jobs endpoint was not found (HTTP 404).")
        elif response.status_code == 429:
            logger.warning("Amazon Jobs rate limited (HTTP 429).")
            raise RateLimitError("Rate limited by Amazon Jobs API.")
        elif response.status_code >= 400:
            logger.error(f"Amazon Jobs HTTP {response.status_code} error: {response.text[:200]}")
            raise SourceHTTPError(f"Amazon Jobs API returned HTTP {response.status_code}: {response.text[:200]}")

        return response

    def _parse_api_response(self, response: httpx.Response) -> tuple[List[Dict[str, Any]], int]:
        """
        Validates and parses JSON payload from Amazon Jobs API.
        Returns: (jobs_list, total_hits)
        """
        try:
            data = response.json()
        except Exception as e:
            logger.error(f"Failed to parse JSON response from Amazon Jobs: {e}")
            raise MalformedSourceDataError(f"Amazon returned non-JSON payload: {e}") from e

        if not isinstance(data, dict):
            raise MalformedSourceDataError(f"Unexpected Amazon root JSON type: {type(data)}")

        total_hits = data.get("hits", 0)
        jobs = data.get("jobs", [])

        if not isinstance(jobs, list):
            raise MalformedSourceDataError(f"Amazon JSON missing expected 'jobs' list. Keys: {list(data.keys())}")

        return jobs, int(total_hits) if isinstance(total_hits, (int, float)) else len(jobs)

    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedJob]:
        """
        Extracts, normalizes, and validates a single Amazon job dictionary into ScrapedJob.
        """
        if not isinstance(raw_data, dict):
            return None

        # 1. External ID (Priority: id_icims, then id)
        raw_id = raw_data.get("id_icims") or raw_data.get("id")
        if raw_id is None:
            logger.warning("Skipping Amazon job with missing 'id_icims'/'id'")
            return None
        external_id = str(raw_id).strip()
        if not external_id:
            return None

        # 2. Title
        title = raw_data.get("title")
        if not title or not isinstance(title, str) or not title.strip():
            logger.warning(f"Skipping Amazon job {external_id} with missing/empty title")
            return None
        cleaned_title = title.strip()

        # 3. Location normalization
        city = raw_data.get("city")
        state = raw_data.get("state")
        country = raw_data.get("country_code")
        raw_loc = raw_data.get("normalized_location") or raw_data.get("location")
        if not raw_loc and any([city, state, country]):
            loc_parts = [p for p in [city, state, country] if p]
            raw_loc = ", ".join(loc_parts)
        location = normalize_location(raw_loc)

        # 4. Description assembly (Body + Basic Qualifications + Preferred Qualifications)
        desc_parts = []
        body = raw_data.get("description") or raw_data.get("description_short")
        if body:
            desc_parts.append(str(body).strip())

        basic_quals = raw_data.get("basic_qualifications")
        if basic_quals:
            desc_parts.append(f"Basic Qualifications:\n{str(basic_quals).strip()}")

        pref_quals = raw_data.get("preferred_qualifications")
        if pref_quals:
            desc_parts.append(f"Preferred Qualifications:\n{str(pref_quals).strip()}")

        combined_desc = "\n\n".join(desc_parts) if desc_parts else None
        description = clean_html(combined_desc)

        # 5. URL
        job_path = raw_data.get("job_path")
        if job_path and isinstance(job_path, str) and job_path.strip():
            canonical_url = urljoin("https://www.amazon.jobs", job_path.strip())
        else:
            canonical_url = f"https://www.amazon.jobs/en/jobs/{external_id}"

        # 6. Posted date
        posted_date = normalize_date(raw_data.get("posted_date") or raw_data.get("updated_time"))

        # 7. Job type detection
        is_intern = raw_data.get("is_intern") is True or "intern" in (raw_data.get("job_category") or "").lower()
        explicit_type = "internship" if is_intern else raw_data.get("job_schedule_type")
        job_type = detect_job_type(
            title=cleaned_title,
            description=description,
            explicit_type=explicit_type
        )

        resolved_company = company_name.strip() if (company_name and company_name.strip()) else "Amazon"

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
            logger.warning(f"Validation failed for Amazon job {external_id}: {err}")
            return None

        return job
