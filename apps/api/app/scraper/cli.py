import asyncio
import argparse
import json
import sys
import logging
from typing import Optional

from app.scraper.pipeline import JobScrapingPipeline
from app.scraper.event_pipeline import EventScrapingPipeline
from app.scraper.filter import (
    FilterPolicy,
    AI_TECH_POLICY,
    EARLY_CAREER_AI_POLICY,
    STRICT_AI_POLICY,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("scraper-cli")


async def run_cli(
    source_name: str,
    board_token: str,
    mode: str = "job",
    company: Optional[str] = None,
    limit: Optional[int] = None,
    output_path: Optional[str] = None,
    pretty: bool = True,
    filter_preset: Optional[str] = None,
    exclude_senior: bool = False
):
    """
    Executes standalone Job or Event scraping pipeline from command line.
    """
    source_lower = source_name.lower().strip()

    if mode.lower() == "event":
        event_pipeline = EventScrapingPipeline()
        try:
            result = await event_pipeline.scrape_source(
                source_name=source_lower,
                board_identifier=board_token,
                company_name=company
            )
        except ValueError as e:
            logger.error(str(e))
            sys.exit(1)

        output_items = result.events
        if limit is not None and limit > 0:
            output_items = output_items[:limit]

        output_data = {
            "status": "success" if not result.errors else "completed_with_errors",
            "mode": "event",
            "source": result.source,
            "board_identifier": result.board_identifier,
            "total_fetched": result.total_fetched,
            "total_valid": result.total_valid,
            "total_deduplicated": result.total_deduplicated,
            "returned_count": len(output_items),
            "errors": result.errors,
            "events": [e.model_dump() for e in output_items]
        }
    else:
        job_pipeline = JobScrapingPipeline()
        policy: Optional[FilterPolicy] = None
        if filter_preset:
            preset_lower = filter_preset.lower().strip()
            if preset_lower in ("ai_tech", "ai_technology", "default"):
                policy = AI_TECH_POLICY.model_copy(deep=True)
            elif preset_lower in ("early_career", "early_career_ai", "internship"):
                policy = EARLY_CAREER_AI_POLICY.model_copy(deep=True)
            elif preset_lower in ("strict", "strict_ai", "strict_ai_only"):
                policy = STRICT_AI_POLICY.model_copy(deep=True)
            else:
                logger.warning(f"Unknown filter preset '{filter_preset}', using default AI_TECH_POLICY.")
                policy = AI_TECH_POLICY.model_copy(deep=True)

        if policy and exclude_senior:
            policy.exclude_senior_roles = True
        elif exclude_senior and not policy:
            policy = AI_TECH_POLICY.model_copy(deep=True)
            policy.exclude_senior_roles = True

        if source_lower == "greenhouse":
            result = await job_pipeline.scrape_greenhouse(board_token=board_token, company_name=company, filter_policy=policy)
        elif source_lower == "lever":
            result = await job_pipeline.scrape_lever(site=board_token, company_name=company, filter_policy=policy)
        elif source_lower == "ashby":
            result = await job_pipeline.scrape_ashby(job_board_name=board_token, company_name=company, filter_policy=policy)
        elif source_lower == "amazon":
            result = await job_pipeline.scrape_amazon(category=board_token, company_name=company or "Amazon", filter_policy=policy)
        elif source_lower == "google":
            result = await job_pipeline.scrape_google(query=board_token, company_name=company or "Google", filter_policy=policy)
        else:
            logger.error(f"Unsupported job source '{source_name}'. Supported: 'greenhouse', 'lever', 'ashby', 'amazon', 'google'")
            sys.exit(1)

        output_jobs = result.jobs
        if limit is not None and limit > 0:
            output_jobs = output_jobs[:limit]

        output_data = {
            "status": "success" if not result.errors else "completed_with_errors",
            "mode": "job",
            "source": result.source,
            "board_identifier": result.board_identifier,
            "total_fetched": result.total_fetched,
            "total_valid": result.total_valid,
            "total_deduplicated": result.total_deduplicated,
            "filter_applied": policy.name if policy else None,
            "returned_count": len(output_jobs),
            "errors": result.errors,
            "jobs": [j.model_dump() for j in output_jobs]
        }

    indent = 2 if pretty else None
    json_str = json.dumps(output_data, indent=indent, ensure_ascii=True)

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(output_data, indent=indent, ensure_ascii=False))
        logger.info(f"Successfully saved output to '{output_path}'.")
    else:
        try:
            if hasattr(sys.stdout, "reconfigure"):
                sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
        print(json_str)


def main():
    parser = argparse.ArgumentParser(description="Career PathFinder Data Collection Pipeline CLI")
    parser.add_argument(
        "--mode",
        type=str,
        default="job",
        choices=["job", "event"],
        help="Pipeline mode: 'job' or 'event' (default: 'job')"
    )
    parser.add_argument(
        "--source",
        type=str,
        default="greenhouse",
        help="Source adapter name (e.g. 'greenhouse' for jobs, 'devfolio' for events)"
    )
    parser.add_argument(
        "--board-token",
        type=str,
        required=True,
        help="Board identifier, category, or search query (e.g. 'canonical', 'all', 'software-development')"
    )
    parser.add_argument(
        "--company",
        type=str,
        default=None,
        help="Optional company/organizer display name"
    )
    parser.add_argument(
        "--filter-policy",
        type=str,
        default=None,
        help="Optional filter preset for jobs: 'ai_tech', 'early_career', 'strict_ai'"
    )
    parser.add_argument(
        "--exclude-senior",
        action="store_true",
        help="Exclude senior, staff, principal, lead, and director roles (job mode only)"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of records to return"
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Optional file path to write JSON output to"
    )
    parser.add_argument(
        "--no-pretty",
        action="store_true",
        help="Disable pretty-printing JSON output"
    )

    args = parser.parse_args()

    asyncio.run(
        run_cli(
            mode=args.mode,
            source_name=args.source,
            board_token=args.board_token,
            company=args.company,
            limit=args.limit,
            output_path=args.output,
            pretty=not args.no_pretty,
            filter_preset=args.filter_policy,
            exclude_senior=args.exclude_senior
        )
    )

if __name__ == "__main__":
    main()
