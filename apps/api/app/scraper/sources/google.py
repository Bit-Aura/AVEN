import logging
import re
import json
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

class GoogleCareersSource(BaseJobSource):
    """
    Adapter for Google Careers Public Search.
    Extracts structured job posting data embedded in server-rendered AF_initDataCallback payloads.
    Fetches from https://www.google.com/about/careers/applications/jobs/results/
    Supports search query parameters and multi-page pagination.
    """
    BASE_URL = "https://www.google.com/about/careers/applications/jobs/results/"

    def __init__(self, timeout: float = 15.0, client: Optional[httpx.AsyncClient] = None):
        self.timeout = timeout
        self._client = client

    @property
    def source_name(self) -> str:
        return "google"

    async def fetch_raw_jobs(
        self,
        board_identifier: str = "software",
        query: Optional[str] = None,
        max_pages: int = 1,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Fetches raw job listings from Google Careers search results.
        
        Args:
            board_identifier (str): Search query or domain identifier (e.g. 'software', 'machine learning').
            query (Optional[str]): Explicit query string overriding board_identifier.
            max_pages (int): Number of result pages to fetch (default: 1).
            
        Returns:
            List[Dict[str, Any]]: List of raw extracted job dictionaries.
        """
        search_query = query or (board_identifier if board_identifier != "google" else "software")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

        all_jobs: List[Dict[str, Any]] = []
        pages_to_fetch = max(1, max_pages)

        if self._client is not None:
            all_jobs = await self._fetch_pages(self._client, search_query, pages_to_fetch, headers)
        else:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                all_jobs = await self._fetch_pages(client, search_query, pages_to_fetch, headers)

        return all_jobs

    async def _fetch_pages(
        self,
        client: httpx.AsyncClient,
        query: str,
        pages_to_fetch: int,
        headers: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """
        Executes paginated requests across page numbers.
        """
        collected_jobs: List[Dict[str, Any]] = []
        seen_ids = set()

        for page in range(1, pages_to_fetch + 1):
            params = {
                "q": query,
                "page": page,
            }
            response = await self._send_request(client, self.BASE_URL, params, headers)
            page_jobs = self._parse_html_response(response.text, page)

            if not page_jobs:
                break

            for job in page_jobs:
                jid = job.get("id")
                if jid and jid not in seen_ids:
                    seen_ids.add(jid)
                    collected_jobs.append(job)

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
            logger.error(f"Google Careers request timed out: {e}")
            raise SourceHTTPError(f"Request to Google Careers timed out: {e}") from e
        except httpx.RequestError as e:
            logger.error(f"Network error accessing Google Careers: {e}")
            raise SourceHTTPError(f"Network error connecting to Google Careers: {e}") from e

        if response.status_code == 404:
            logger.warning("Google Careers endpoint returned 404.")
            raise BoardNotFoundError("Google Careers page returned HTTP 404.")
        elif response.status_code == 429:
            logger.warning("Google Careers rate limited (HTTP 429).")
            raise RateLimitError("Rate limited by Google Careers.")
        elif response.status_code >= 400:
            logger.error(f"Google Careers HTTP {response.status_code} error: {response.text[:200]}")
            raise SourceHTTPError(f"Google Careers returned HTTP {response.status_code}: {response.text[:200]}")

        return response

    def _parse_html_response(self, html_text: str, page_num: int) -> List[Dict[str, Any]]:
        """
        Extracts and deserializes Google's AF_initDataCallback ('ds:1') structured JSON dataset.
        Applies defensive structural validation to safeguard against internal format shifts.
        """
        if not html_text or not html_text.strip():
            return []

        # Find AF_initDataCallback with key ds:1
        match = re.search(
            r'AF_initDataCallback\(\s*\{.*?key:\s*\'ds:1\'.*?data:\s*(\[.*?\])\s*,\s*sideChannel',
            html_text,
            re.DOTALL
        )
        if not match:
            # Fallback regex for alternative formatting
            match = re.search(
                r'AF_initDataCallback\(\s*\{.*?key:\s*\'ds:1\'.*?data:\s*(\[.*?\])\s*\}\s*\);',
                html_text,
                re.DOTALL
            )

        if not match:
            logger.warning(f"Could not locate ds:1 AF_initDataCallback on Google Careers page {page_num}.")
            return []

        try:
            data = json.loads(match.group(1))
        except Exception as e:
            logger.error(f"Failed to decode Google AF_initDataCallback JSON: {e}")
            raise MalformedSourceDataError(f"Google Careers returned invalid callback JSON: {e}") from e

        if not isinstance(data, list) or not data or not isinstance(data[0], list):
            logger.warning(f"Unexpected Google Careers callback root structure: {type(data)}")
            return []

        raw_items = data[0]
        parsed_jobs: List[Dict[str, Any]] = []

        for idx, item in enumerate(raw_items):
            if not isinstance(item, list) or len(item) < 2:
                continue

            job_id = str(item[0]).strip() if item[0] else None
            title = str(item[1]).strip() if len(item) > 1 and item[1] else None

            if not job_id or not title:
                continue

            # Signin/Apply URL
            apply_url = str(item[2]).strip() if len(item) > 2 and item[2] else None

            # Responsibilities HTML (item[3][1])
            resp_html = None
            if len(item) > 3 and isinstance(item[3], list) and len(item[3]) > 1:
                resp_html = item[3][1]

            # Qualifications HTML (item[4][1])
            qual_html = None
            if len(item) > 4 and isinstance(item[4], list) and len(item[4]) > 1:
                qual_html = item[4][1]

            # Locations list (item[9])
            locations = []
            if len(item) > 9 and isinstance(item[9], list):
                for loc_entry in item[9]:
                    if isinstance(loc_entry, list) and len(loc_entry) > 0 and loc_entry[0]:
                        locations.append(str(loc_entry[0]).strip())
            location_str = ", ".join(locations) if locations else None

            # Role Overview HTML (item[10][1])
            role_overview_html = None
            if len(item) > 10 and isinstance(item[10], list) and len(item[10]) > 1:
                role_overview_html = item[10][1]

            # Timestamp seconds (item[12][0] or item[13][0])
            posted_ts = None
            for ts_idx in (12, 13, 14):
                if len(item) > ts_idx and isinstance(item[ts_idx], list) and len(item[ts_idx]) > 0:
                    val = item[ts_idx][0]
                    if isinstance(val, (int, float)) and val > 0:
                        posted_ts = val
                        break

            parsed_jobs.append({
                "id": job_id,
                "title": title,
                "apply_url": apply_url,
                "role_overview": role_overview_html,
                "responsibilities": resp_html,
                "qualifications": qual_html,
                "location": location_str,
                "posted_timestamp": posted_ts,
            })

        return parsed_jobs

    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedJob]:
        """
        Extracts, normalizes, and validates a single Google job item into ScrapedJob.
        """
        if not isinstance(raw_data, dict):
            return None

        # 1. External ID
        job_id = raw_data.get("id")
        if not job_id:
            return None
        external_id = str(job_id).strip()

        # 2. Title
        title = raw_data.get("title")
        if not title or not isinstance(title, str) or not title.strip():
            return None
        cleaned_title = title.strip()

        # 3. Description assembly
        desc_parts = []
        if raw_data.get("role_overview"):
            desc_parts.append(str(raw_data["role_overview"]))
        if raw_data.get("responsibilities"):
            desc_parts.append(f"Responsibilities:\n{str(raw_data['responsibilities'])}")
        if raw_data.get("qualifications"):
            desc_parts.append(f"Qualifications:\n{str(raw_data['qualifications'])}")

        combined_desc = "\n\n".join(desc_parts) if desc_parts else None
        description = clean_html(combined_desc)

        # 4. Location normalization
        location = normalize_location(raw_data.get("location"))

        # 5. Canonical URL
        canonical_url = f"https://www.google.com/about/careers/applications/jobs/results/{external_id}"

        # 6. Posted date
        posted_date = normalize_date(raw_data.get("posted_timestamp"))

        # 7. Job type detection
        job_type = detect_job_type(title=cleaned_title, description=description)

        resolved_company = company_name.strip() if (company_name and company_name.strip()) else "Google"

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
            logger.warning(f"Validation failed for Google job {external_id}: {err}")
            return None

        return job
