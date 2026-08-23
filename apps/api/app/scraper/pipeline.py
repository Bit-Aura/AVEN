import logging
from typing import Optional, List, Dict, Any
from .models import ScrapedJob, ScrapeResult
from .sources.base import BaseJobSource, ScraperException
from .sources.greenhouse import GreenhouseSource
from .sources.lever import LeverSource
from .deduplicator import deduplicate_jobs
from .filter import FilterPolicy, FilterResult, filter_jobs

logger = logging.getLogger(__name__)

class JobScrapingPipeline:
    """
    Main orchestrator for fetching, extracting, normalizing, validating,
    deduplicating, and optionally filtering job postings from external job boards.
    """
    def __init__(
        self,
        greenhouse_source: Optional[GreenhouseSource] = None,
        lever_source: Optional[LeverSource] = None
    ):
        self.greenhouse_source = greenhouse_source or GreenhouseSource()
        self.lever_source = lever_source or LeverSource()

    async def run_pipeline(
        self,
        source: BaseJobSource,
        board_identifier: str,
        company_name: Optional[str] = None,
        filter_policy: Optional[FilterPolicy] = None
    ) -> ScrapeResult:
        """
        Executes the end-to-end data collection pipeline for a given source adapter.
        
        Args:
            source (BaseJobSource): The configured source adapter.
            board_identifier (str): Board token or account name.
            company_name (Optional[str]): Human-readable company name for tagging.
            filter_policy (Optional[FilterPolicy]): Optional domain/seniority filter policy.
            
        Returns:
            ScrapeResult: Summary report containing normalized, deduplicated (and optionally filtered) jobs.
        """
        result = ScrapeResult(
            source=source.source_name,
            board_identifier=board_identifier
        )

        logger.info(f"Starting job scraping pipeline for source='{source.source_name}', board='{board_identifier}'...")

        # 1. Fetch raw data from external source
        raw_items: List[Dict[str, Any]] = []
        try:
            raw_items = await source.fetch_raw_jobs(board_identifier)
            result.total_fetched = len(raw_items)
            logger.info(f"Successfully fetched {len(raw_items)} raw job postings from '{board_identifier}'.")
        except ScraperException as e:
            logger.error(f"Scraper error while fetching '{board_identifier}': {e}")
            result.errors.append(str(e))
            return result
        except Exception as e:
            logger.exception(f"Unexpected error while fetching '{board_identifier}': {e}")
            result.errors.append(f"Unexpected fetch error: {str(e)}")
            return result

        # 2. Extract, clean, and validate individual jobs
        valid_jobs: List[ScrapedJob] = []
        for index, raw_job in enumerate(raw_items):
            try:
                job = source.extract_job(raw_job, company_name=company_name)
                if job:
                    valid_jobs.append(job)
                else:
                    logger.debug(f"Job at index {index} skipped during extraction/validation.")
            except Exception as e:
                logger.warning(f"Error processing raw job at index {index}: {e}")
                result.errors.append(f"Item #{index} extraction error: {str(e)}")

        result.total_valid = len(valid_jobs)

        # 3. Deduplicate in-memory
        deduped_jobs, removed_dupes_count = deduplicate_jobs(valid_jobs)
        result.total_deduplicated = len(deduped_jobs)

        # 4. Optional Universal Filter
        if filter_policy is not None:
            filtered_result = filter_jobs(deduped_jobs, policy=filter_policy)
            result.jobs = filtered_result.jobs
            logger.info(
                f"Universal filter applied ({filter_policy.name}): "
                f"{filtered_result.accepted_count}/{filtered_result.total_input} jobs accepted."
            )
        else:
            result.jobs = deduped_jobs

        logger.info(
            f"Pipeline completed for '{board_identifier}': "
            f"Fetched={result.total_fetched}, Valid={result.total_valid}, "
            f"Deduplicated={result.total_deduplicated} (removed {removed_dupes_count} duplicates), "
            f"Returned={len(result.jobs)}."
        )

        return result

    async def scrape_greenhouse(
        self,
        board_token: str,
        company_name: Optional[str] = None,
        filter_policy: Optional[FilterPolicy] = None
    ) -> ScrapeResult:
        """
        Convenience wrapper to scrape a Greenhouse public job board.
        """
        return await self.run_pipeline(
            source=self.greenhouse_source,
            board_identifier=board_token,
            company_name=company_name,
            filter_policy=filter_policy
        )

    async def scrape_lever(
        self,
        site: str,
        company_name: Optional[str] = None,
        filter_policy: Optional[FilterPolicy] = None
    ) -> ScrapeResult:
        """
        Convenience wrapper to scrape a Lever public job board.
        """
        return await self.run_pipeline(
            source=self.lever_source,
            board_identifier=site,
            company_name=company_name,
            filter_policy=filter_policy
        )

    def filter(
        self,
        jobs: List[ScrapedJob],
        policy: Optional[FilterPolicy] = None
    ) -> FilterResult:
        """
        Direct convenience helper to execute universal filtering on an existing job list.
        """
        return filter_jobs(jobs, policy=policy)
