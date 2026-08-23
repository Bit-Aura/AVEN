import logging
import asyncio
import hashlib
from urllib.parse import urljoin
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field, field_validator, ConfigDict

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


class HTMLSelectorConfig(BaseModel):
    """
    Configuration specification for selector-driven static HTML career pages.
    Validates required selectors before attempting network extraction.
    """
    company_name: str = Field(..., description="Canonical hiring company name")
    base_url: str = Field(..., description="Target career listing page URL")
    
    # Required Selectors
    job_container_selector: str = Field(..., description="CSS selector identifying each job card container")
    title_selector: str = Field(..., description="CSS selector for the job title inside the container")
    link_selector: str = Field(..., description="CSS selector for the job application/detail link")

    # Optional Listing Selectors
    location_selector: Optional[str] = Field(default=None, description="CSS selector for job location")
    department_selector: Optional[str] = Field(default=None, description="CSS selector for department/team")
    job_type_selector: Optional[str] = Field(default=None, description="CSS selector for employment type")
    date_selector: Optional[str] = Field(default=None, description="CSS selector for publication date")
    description_selector: Optional[str] = Field(default=None, description="CSS selector for inline description (Pattern A)")

    # Detail Page Retrieval (Pattern B)
    is_detail_page_required: bool = Field(default=False, description="Whether full descriptions require fetching detail pages")
    detail_description_selector: Optional[str] = Field(default=None, description="CSS selector for description on the detail page")
    max_detail_concurrency: int = Field(default=5, ge=1, le=20, description="Bounded concurrency limit for fetching detail pages")

    model_config = ConfigDict(extra="ignore")

    @field_validator("job_container_selector", "title_selector", "link_selector")
    @classmethod
    def validate_required_selectors(cls, v: str) -> str:
        cleaned = (v or "").strip()
        if not cleaned:
            raise ValueError("Required CSS selector cannot be empty or blank.")
        return cleaned

    @field_validator("base_url")
    @classmethod
    def validate_base_url(cls, v: str) -> str:
        cleaned = (v or "").strip()
        if not (cleaned.startswith("http://") or cleaned.startswith("https://")):
            raise ValueError("base_url must be a valid HTTP/HTTPS URL.")
        return cleaned


class StaticHTMLCareerSource(BaseJobSource):
    """
    Generic source adapter for static / server-rendered HTML career pages.
    Supports Pattern A (listing-only) and Pattern B (detail-page retrieval with bounded concurrency).
    """
    def __init__(
        self,
        config: HTMLSelectorConfig,
        timeout: float = 15.0,
        client: Optional[httpx.AsyncClient] = None
    ):
        self.config = config
        self.timeout = timeout
        self._client = client

    @property
    def source_name(self) -> str:
        return f"static_html::{self.config.company_name.lower().replace(' ', '_')}"

    async def fetch_raw_jobs(self, board_identifier: str, **kwargs) -> List[Dict[str, Any]]:
        """
        Fetches the listing HTML page and extracts raw job card dictionaries.
        If configured for Pattern B, retrieves detail pages under bounded concurrency.
        """
        target_url = (board_identifier or self.config.base_url).strip()
        if not target_url:
            raise ValueError("Target career page URL cannot be empty.")

        headers = {
            "User-Agent": "CareerPathFinder-JobScraper/1.0 (StaticHTMLAdapter)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

        if self._client is not None:
            response = await self._send_request(self._client, target_url, headers)
            html_text = response.text
            raw_jobs = self._parse_listing_html(html_text, target_url)
            if self.config.is_detail_page_required and raw_jobs:
                raw_jobs = await self._enrich_with_detail_pages(self._client, raw_jobs, headers)
        else:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await self._send_request(client, target_url, headers)
                html_text = response.text
                raw_jobs = self._parse_listing_html(html_text, target_url)
                if self.config.is_detail_page_required and raw_jobs:
                    raw_jobs = await self._enrich_with_detail_pages(client, raw_jobs, headers)

        return raw_jobs

    async def _send_request(
        self,
        client: httpx.AsyncClient,
        url: str,
        headers: Dict[str, str]
    ) -> httpx.Response:
        """
        Executes HTTP GET request with standard error handling.
        """
        try:
            response = await client.get(url, headers=headers)
        except httpx.TimeoutException as e:
            logger.error(f"Static HTML request timed out for '{url}': {e}")
            raise SourceHTTPError(f"Request to '{url}' timed out: {e}") from e
        except httpx.RequestError as e:
            logger.error(f"Network error accessing '{url}': {e}")
            raise SourceHTTPError(f"Network error connecting to '{url}': {e}") from e

        if response.status_code == 404:
            logger.warning(f"Career page '{url}' not found (HTTP 404).")
            raise BoardNotFoundError(f"Career page '{url}' returned HTTP 404.")
        elif response.status_code == 429:
            logger.warning(f"Rate limited (HTTP 429) for '{url}'.")
            raise RateLimitError(f"Rate limited while fetching '{url}'.")
        elif response.status_code >= 400:
            logger.error(f"HTTP {response.status_code} error for '{url}': {response.text[:200]}")
            raise SourceHTTPError(f"HTTP {response.status_code} for '{url}': {response.text[:200]}")

        return response

    def _parse_listing_html(self, html_text: str, base_url: str) -> List[Dict[str, Any]]:
        """
        Parses listing HTML and extracts raw job dictionaries based on CSS selector config.
        """
        if not html_text or not html_text.strip():
            return []

        try:
            soup = BeautifulSoup(html_text, "html.parser")
        except Exception as e:
            raise MalformedSourceDataError(f"Failed to parse HTML from '{base_url}': {e}") from e

        containers = soup.select(self.config.job_container_selector)
        raw_items: List[Dict[str, Any]] = []

        for container in containers:
            # 1. Title (Required)
            title_elem = container.select_one(self.config.title_selector)
            if not title_elem:
                continue
            title_text = title_elem.get_text(strip=True)
            if not title_text:
                continue

            # 2. Link / URL (Required)
            link_elem = container.select_one(self.config.link_selector)
            raw_href = link_elem.get("href", "") if link_elem else ""
            if not raw_href:
                # Check if container itself is an anchor
                raw_href = container.get("href", "") if container.name == "a" else ""

            canonical_url = urljoin(base_url, raw_href.strip()) if raw_href else None

            # 3. External ID (Source ID attribute or deterministic SHA-256 hash of URL)
            source_id = container.get("data-id") or container.get("id")
            if source_id and str(source_id).strip():
                external_id = str(source_id).strip()
            elif canonical_url:
                external_id = hashlib.sha256(canonical_url.encode("utf-8")).hexdigest()[:16]
            else:
                # Fallback deterministic hash of title + company
                external_id = hashlib.sha256(f"{title_text}::{self.config.company_name}".encode("utf-8")).hexdigest()[:16]

            # 4. Optional Listing Fields
            location_text = None
            if self.config.location_selector:
                loc_elem = container.select_one(self.config.location_selector)
                if loc_elem:
                    location_text = loc_elem.get_text(strip=True)

            department_text = None
            if self.config.department_selector:
                dept_elem = container.select_one(self.config.department_selector)
                if dept_elem:
                    department_text = dept_elem.get_text(strip=True)

            job_type_text = None
            if self.config.job_type_selector:
                jt_elem = container.select_one(self.config.job_type_selector)
                if jt_elem:
                    job_type_text = jt_elem.get_text(strip=True)

            date_text = None
            if self.config.date_selector:
                dt_elem = container.select_one(self.config.date_selector)
                if dt_elem:
                    date_text = dt_elem.get("datetime") or dt_elem.get_text(strip=True)

            desc_text = None
            if self.config.description_selector:
                desc_elem = container.select_one(self.config.description_selector)
                if desc_elem:
                    desc_text = str(desc_elem)

            raw_items.append({
                "external_id": external_id,
                "title": title_text,
                "company": self.config.company_name,
                "url": canonical_url,
                "location": location_text,
                "department": department_text,
                "job_type_raw": job_type_text,
                "posted_date_raw": date_text,
                "description_raw": desc_text,
            })

        return raw_items

    async def _enrich_with_detail_pages(
        self,
        client: httpx.AsyncClient,
        raw_jobs: List[Dict[str, Any]],
        headers: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """
        Pattern B: Fetches detail pages with bounded concurrency to extract full descriptions.
        Tolerates individual page failures and deduplicates requests.
        """
        semaphore = asyncio.Semaphore(self.config.max_detail_concurrency)
        unique_urls = {j["url"] for j in raw_jobs if j.get("url")}
        url_to_desc: Dict[str, Optional[str]] = {}

        async def fetch_detail(url: str):
            async with semaphore:
                try:
                    resp = await client.get(url, headers=headers)
                    if resp.status_code == 200:
                        soup = BeautifulSoup(resp.text, "html.parser")
                        selector = self.config.detail_description_selector or self.config.description_selector
                        if selector:
                            elem = soup.select_one(selector)
                            if elem:
                                url_to_desc[url] = str(elem)
                                return
                        # Fallback: extract main/article body if no selector specified
                        main_elem = soup.select_one("main, article, .job-description, #job-description")
                        url_to_desc[url] = str(main_elem) if main_elem else resp.text
                    else:
                        logger.warning(f"Detail page '{url}' returned status {resp.status_code}")
                except Exception as e:
                    logger.warning(f"Failed to fetch detail page '{url}': {e}")
                    url_to_desc[url] = None

        tasks = [fetch_detail(url) for url in unique_urls if url]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

        for job in raw_jobs:
            url = job.get("url")
            if url and url in url_to_desc and url_to_desc[url]:
                job["description_raw"] = url_to_desc[url]

        return raw_jobs

    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedJob]:
        """
        Extracts and normalizes a single raw dictionary item into ScrapedJob.
        """
        if not isinstance(raw_data, dict):
            return None

        external_id = raw_data.get("external_id")
        if not external_id or not str(external_id).strip():
            return None

        title = raw_data.get("title")
        if not title or not isinstance(title, str) or not title.strip():
            return None
        cleaned_title = title.strip()

        # Description cleaning
        description = clean_html(raw_data.get("description_raw"))

        # Location normalization
        location = normalize_location(raw_data.get("location"))

        # Job type detection
        job_type = detect_job_type(
            title=cleaned_title,
            description=description,
            explicit_type=raw_data.get("job_type_raw")
        )

        # Date normalization
        posted_date = normalize_date(raw_data.get("posted_date_raw"))

        resolved_company = company_name.strip() if (company_name and company_name.strip()) else self.config.company_name

        payload = {
            "external_id": str(external_id).strip(),
            "source": self.source_name,
            "title": cleaned_title,
            "company": resolved_company,
            "location": location,
            "job_type": job_type,
            "description": description,
            "url": raw_data.get("url"),
            "posted_date": posted_date,
        }

        job, err = construct_and_validate_job(payload)
        if err:
            logger.warning(f"Validation failed for Static HTML job {external_id}: {err}")
            return None

        return job
