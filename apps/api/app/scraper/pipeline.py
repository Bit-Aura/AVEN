import logging
from typing import Optional, List, Dict, Any
from .models import ScrapedJob, ScrapeResult
from .sources.base import BaseJobSource, ScraperException
from .sources.greenhouse import GreenhouseSource
from .deduplicator import deduplicate_jobs

logger = logging.getLogger(__name__)

class JobScrapingPipeline:
    """
    Main orchestrator for fetching, extracting, normalizing, validating,
    and deduplicating job postings from external job boards.
    """
    def __init__(self, greenhouse_source: Optional[GreenhouseSource] = None):
        self.greenhouse_source = greenhouse_source or GreenhouseSource()

    async def run_pipeline(
        self,
        source: BaseJobSource,
        board_identifier: str,
        company_name: Optional[str] = None
    ) -> ScrapeResult:
        """
        Executes the end-to-end data collection pipeline for a given source adapter.
        
        Args:
            source (BaseJobSource): The configured source adapter.
            board_identifier (str): Board token or account name.
            company_name (Optional[str]): Human-readable company name for tagging.
            
        Returns:
            ScrapeResult: Summary report containing normalized, deduplicated jobs.
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
        result.jobs = deduped_jobs

        logger.info(
            f"Pipeline completed for '{board_identifier}': "
            f"Fetched={result.total_fetched}, Valid={result.total_valid}, "
            f"Deduplicated={result.total_deduplicated} (removed {removed_dupes_count} duplicates)."
        )

        return result

    async def scrape_greenhouse(
        self,
        board_token: str,
        company_name: Optional[str] = None
    ) -> ScrapeResult:
        """
        Convenience wrapper to scrape a Greenhouse public job board.
        """
        return await self.run_pipeline(
            source=self.greenhouse_source,
            board_identifier=board_token,
            company_name=company_name
        )
