import pytest
import httpx
import json
from unittest.mock import patch

from app.scraper.models import ScrapedJob, ScrapeResult
from app.scraper.sources.ashby import AshbySource
from app.scraper.sources.base import BoardNotFoundError, RateLimitError, SourceHTTPError, MalformedSourceDataError
from app.scraper.pipeline import JobScrapingPipeline
from app.scraper.cli import run_cli
from app.scraper.filter import AI_TECH_POLICY, EARLY_CAREER_AI_POLICY, STRICT_AI_POLICY


@pytest.mark.asyncio
async def test_ashby_successful_single_and_multi_job_extraction():
    sample_ashby_data = {
        "apiVersion": "1.0",
        "jobs": [
            {
                "id": "81f09568-da7d-4ed1-8283-614f846c9b00",
                "title": "Staff Machine Learning Engineer, AI",
                "department": "Engineering",
                "team": "Engineering",
                "employmentType": "FullTime",
                "location": "San Francisco, California",
                "secondaryLocations": [],
                "publishedAt": "2025-07-26T00:23:05.632+00:00",
                "isListed": True,
                "isRemote": True,
                "workplaceType": "Hybrid",
                "address": {
                    "postalAddress": {
                        "addressRegion": "California",
                        "addressCountry": "United States",
                        "addressLocality": "San Francisco"
                    }
                },
                "jobUrl": "https://jobs.ashbyhq.com/sentry/81f09568-da7d-4ed1-8283-614f846c9b00",
                "applyUrl": "https://jobs.ashbyhq.com/sentry/81f09568-da7d-4ed1-8283-614f846c9b00/application",
                "descriptionHtml": "<h2><strong>About Sentry</strong></h2><p>Build state-of-the-art agentic AI platforms.</p><ul><li>PyTorch</li><li>Python</li></ul>",
                "descriptionPlain": "Build state-of-the-art agentic AI platforms."
            },
            {
                "id": "99f09568-da7d-4ed1-8283-614f846c9b99",
                "title": "Machine Learning Intern",
                "department": "Research",
                "employmentType": "Intern",
                "location": None,
                "isRemote": True,
                "publishedAt": "2025-08-01T12:00:00Z",
                "jobUrl": "https://jobs.ashbyhq.com/sentry/99f09568-da7d-4ed1-8283-614f846c9b99",
                "descriptionHtml": "<p>Summer 2026 AI research internship for students.</p>"
            }
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert "api.ashbyhq.com/posting-api/job-board/sentry" in str(request.url)
        return httpx.Response(200, json=sample_ashby_data)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        source = AshbySource(client=client)
        pipeline = JobScrapingPipeline(ashby_source=source)

        result = await pipeline.scrape_ashby(
            job_board_name="sentry",
            company_name="Sentry",
            filter_policy=AI_TECH_POLICY
        )

        assert result.total_fetched == 2
        assert result.total_valid == 2
        assert result.total_deduplicated == 2
        assert len(result.jobs) == 2

        # Verify Job 1
        j1 = result.jobs[0]
        assert j1.external_id == "81f09568-da7d-4ed1-8283-614f846c9b00"
        assert j1.source == "ashby"
        assert j1.title == "Staff Machine Learning Engineer, AI"
        assert j1.company == "Sentry"
        assert j1.location == "San Francisco, California"
        assert j1.job_type == "full_time"
        assert j1.url == "https://jobs.ashbyhq.com/sentry/81f09568-da7d-4ed1-8283-614f846c9b00"
        assert "Build state-of-the-art agentic AI platforms." in j1.description
        assert "• PyTorch" in j1.description
        assert j1.posted_date == "2025-07-26T00:23:05.632000+00:00"

        # Verify Job 2
        j2 = result.jobs[1]
        assert j2.external_id == "99f09568-da7d-4ed1-8283-614f846c9b99"
        assert j2.title == "Machine Learning Intern"
        assert j2.job_type == "internship"
        assert j2.location == "Remote"
        assert "Summer 2026 AI research internship" in j2.description


@pytest.mark.asyncio
async def test_ashby_company_metadata_not_fabricated():
    sample_data = {
        "jobs": [
            {
                "id": "ashby-no-company-1",
                "title": "Software Engineer",
                "jobUrl": "https://jobs.ashbyhq.com/someboard/ashby-no-company-1"
            }
        ]
    }

    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = AshbySource(client=client)
        pipeline = JobScrapingPipeline(ashby_source=source)

        # Scrape without providing company_name
        result = await pipeline.scrape_ashby(job_board_name="someboard", company_name=None)
        assert len(result.jobs) == 1
        assert result.jobs[0].company is None  # No fabricated company name


@pytest.mark.asyncio
async def test_ashby_empty_board():
    sample_data = {"apiVersion": "1.0", "jobs": []}
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = AshbySource(client=client)
        pipeline = JobScrapingPipeline(ashby_source=source)

        result = await pipeline.scrape_ashby(job_board_name="emptyboard")
        assert result.total_fetched == 0
        assert result.total_valid == 0
        assert len(result.jobs) == 0
        assert len(result.errors) == 0


@pytest.mark.asyncio
async def test_ashby_malformed_individual_job_in_batch():
    sample_data = {
        "jobs": [
            {"id": "valid-1", "title": "Backend Engineer", "jobUrl": "https://jobs.ashbyhq.com/board/valid-1"},
            {"id": None, "title": "Invalid No ID"},
            {"id": "invalid-no-title", "title": ""},
            {"id": "valid-2", "title": "Frontend Engineer", "jobUrl": "https://jobs.ashbyhq.com/board/valid-2"}
        ]
    }
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = AshbySource(client=client)
        pipeline = JobScrapingPipeline(ashby_source=source)

        result = await pipeline.scrape_ashby(job_board_name="board")
        assert result.total_fetched == 4
        assert result.total_valid == 2
        assert len(result.jobs) == 2
        assert [j.external_id for j in result.jobs] == ["valid-1", "valid-2"]


@pytest.mark.asyncio
async def test_ashby_http_and_parsing_errors():
    # 404 Not Found
    t404 = httpx.MockTransport(lambda req: httpx.Response(404, text="Not Found"))
    async with httpx.AsyncClient(transport=t404) as client:
        source = AshbySource(client=client)
        pipeline = JobScrapingPipeline(ashby_source=source)
        res = await pipeline.scrape_ashby(job_board_name="nonexistent")
        assert len(res.errors) > 0
        assert "not found" in res.errors[0].lower()

    # 429 Rate Limit
    t429 = httpx.MockTransport(lambda req: httpx.Response(429, text="Rate limit exceeded"))
    async with httpx.AsyncClient(transport=t429) as client:
        source = AshbySource(client=client)
        pipeline = JobScrapingPipeline(ashby_source=source)
        res = await pipeline.scrape_ashby(job_board_name="busy")
        assert len(res.errors) > 0
        assert "rate limited" in res.errors[0].lower()

    # 500 Server Error
    t500 = httpx.MockTransport(lambda req: httpx.Response(500, text="Internal Error"))
    async with httpx.AsyncClient(transport=t500) as client:
        source = AshbySource(client=client)
        pipeline = JobScrapingPipeline(ashby_source=source)
        res = await pipeline.scrape_ashby(job_board_name="broken")
        assert len(res.errors) > 0
        assert "500" in res.errors[0]

    # Non-JSON payload
    t_nonjson = httpx.MockTransport(lambda req: httpx.Response(200, text="<html>Gateway timeout</html>"))
    async with httpx.AsyncClient(transport=t_nonjson) as client:
        source = AshbySource(client=client)
        pipeline = JobScrapingPipeline(ashby_source=source)
        res = await pipeline.scrape_ashby(job_board_name="badjson")
        assert len(res.errors) > 0
        assert "non-json" in res.errors[0].lower()

    # Missing 'jobs' key
    t_badshape = httpx.MockTransport(lambda req: httpx.Response(200, json={"status": "ok"}))
    async with httpx.AsyncClient(transport=t_badshape) as client:
        source = AshbySource(client=client)
        pipeline = JobScrapingPipeline(ashby_source=source)
        res = await pipeline.scrape_ashby(job_board_name="badshape")
        assert len(res.errors) > 0
        assert "missing expected 'jobs'" in res.errors[0].lower()


@pytest.mark.asyncio
async def test_ashby_cli_execution(tmp_path):
    sample_job = ScrapedJob(
        external_id="ashby-cli-1",
        source="ashby",
        title="Senior AI Engineer",
        company="Perplexity",
        url="https://jobs.ashbyhq.com/perplexity/ashby-cli-1"
    )
    mock_result = ScrapeResult(
        source="ashby",
        board_identifier="perplexity",
        total_fetched=1,
        total_valid=1,
        total_deduplicated=1,
        jobs=[sample_job]
    )

    out_file = str(tmp_path / "ashby_output.json")
    with patch.object(JobScrapingPipeline, "scrape_ashby", return_value=mock_result):
        await run_cli(
            source_name="ashby",
            board_token="perplexity",
            company="Perplexity",
            output_path=out_file,
            filter_preset="strict_ai"
        )

    with open(out_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["status"] == "success"
    assert data["source"] == "ashby"
    assert data["board_identifier"] == "perplexity"
    assert data["jobs"][0]["title"] == "Senior AI Engineer"
