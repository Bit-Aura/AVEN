import asyncio
import argparse
import json
import sys
import logging
from typing import Optional

from app.scraper.pipeline import JobScrapingPipeline
from app.scraper.sources.greenhouse import GreenhouseSource

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("scraper-cli")

async def run_cli(
    source_name: str,
    board_token: str,
    company: Optional[str] = None,
    limit: Optional[int] = None,
    output_path: Optional[str] = None,
    pretty: bool = True
):
    """
    Executes the standalone scraping pipeline from command line.
    """
    pipeline = JobScrapingPipeline()

    if source_name.lower() == "greenhouse":
        result = await pipeline.scrape_greenhouse(
            board_token=board_token,
            company_name=company
        )
    else:
        logger.error(f"Unsupported source '{source_name}'. Currently supported: 'greenhouse'")
        sys.exit(1)

    # Optional result truncation for CLI preview
    output_jobs = result.jobs
    if limit is not None and limit > 0:
        output_jobs = output_jobs[:limit]

    output_data = {
        "status": "success" if not result.errors else "completed_with_errors",
        "source": result.source,
        "board_identifier": result.board_identifier,
        "total_fetched": result.total_fetched,
        "total_valid": result.total_valid,
        "total_deduplicated": result.total_deduplicated,
        "returned_count": len(output_jobs),
        "errors": result.errors,
        "jobs": [j.model_dump() for j in output_jobs]
    }

    indent = 2 if pretty else None
    json_str = json.dumps(output_data, indent=indent, ensure_ascii=True)

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(output_data, indent=indent, ensure_ascii=False))
        logger.info(f"Successfully saved {len(output_jobs)} jobs to '{output_path}'.")
    else:
        try:
            if hasattr(sys.stdout, "reconfigure"):
                sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
        print(json_str)

def main():
    parser = argparse.ArgumentParser(description="Career PathFinder Job Data Collection Pipeline CLI")
    parser.add_argument(
        "--source",
        type=str,
        default="greenhouse",
        help="Job board source adapter (default: 'greenhouse')"
    )
    parser.add_argument(
        "--board-token",
        type=str,
        required=True,
        help="Greenhouse board identifier token (e.g. 'canonical', 'stripe')"
    )
    parser.add_argument(
        "--company",
        type=str,
        default=None,
        help="Optional company display name"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of jobs to return in output"
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
            source_name=args.source,
            board_token=args.board_token,
            company=args.company,
            limit=args.limit,
            output_path=args.output,
            pretty=not args.no_pretty
        )
    )

if __name__ == "__main__":
    main()
