import pytest
import httpx
import json
from unittest.mock import patch

from app.scraper.models import ScrapedJob, ScrapeResult
from app.scraper.sources.amazon import AmazonJobsSource
from app.scraper.pipeline import JobScrapingPipeline
from app.scraper.cli import run_cli
from app.scraper.filter import AI_TECH_POLICY, EARLY_CAREER_AI_POLICY


@pytest.mark.asyncio
async def test_amazon_successful_multi_job_extraction():
    sample_data = {
        "hits": 2,
        "jobs": [
            {
                "id_icims": "10511619",
                "title": "Machine Learning Scientist",
                "company_name": "Amazon.com Services LLC",
                "city": "Seattle",
                "state": "WA",
                "country_code": "USA",
                "job_schedule_type": "full-time",
                "is_intern": False,
                "description": "<p>Join Amazon to build generative AI models.</p>",
                "basic_qualifications": "<li>PhD in Computer Science or ML</li>",
                "preferred_qualifications": "<li>PyTorch, AWS SageMaker</li>",
                "job_path": "/en/jobs/10511619/machine-learning-scientist",
                "posted_date": "August 20, 2026"
            },
            {
                "id_icims": "10511620",
                "title": "Software Development Engineer Intern",
                "location": "Sunnyvale, CA, USA",
                "job_schedule_type": "full-time",
                "is_intern": True,
                "description": "<p>Summer 2026 internship for students.</p>",
                "basic_qualifications": None,
                "preferred_qualifications": None,
                "job_path": "/en/jobs/10511620/software-development-engineer-intern",
                "posted_date": None
            }
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert "amazon.jobs" in str(request.url)
        assert "/en/search.json" in str(request.url)
        return httpx.Response(200, json=sample_data)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        source = AmazonJobsSource(client=client)
        pipeline = JobScrapingPipeline(amazon_source=source)

        result = await pipeline.scrape_amazon(category="software-development", company_name="Amazon")

        assert result.total_fetched == 2
        assert result.total_valid == 2
        assert result.total_deduplicated == 2
        assert len(result.jobs) == 2

        # Job 1
        j1 = result.jobs[0]
        assert j1.external_id == "10511619"
        assert j1.source == "amazon"
        assert j1.title == "Machine Learning Scientist"
        assert j1.company == "Amazon"
        assert "Seattle, WA, USA" in j1.location
        assert j1.job_type == "full_time"
        assert j1.url == "https://www.amazon.jobs/en/jobs/10511619/machine-learning-scientist"
        assert "Join Amazon to build generative AI models." in j1.description
        assert "Basic Qualifications:" in j1.description
        assert "Preferred Qualifications:" in j1.description
        assert "• PyTorch, AWS SageMaker" in j1.description
        assert j1.posted_date is not None

        # Job 2
        j2 = result.jobs[1]
        assert j2.external_id == "10511620"
        assert j2.title == "Software Development Engineer Intern"
        assert j2.job_type == "internship"  # is_intern: True detected as internship
        assert j2.posted_date is None


@pytest.mark.asyncio
async def test_amazon_pagination_handling():
    page1_data = {
        "hits": 4,
        "jobs": [
            {"id_icims": "amz-1", "title": "SWE I", "job_path": "/en/jobs/amz-1"},
            {"id_icims": "amz-2", "title": "SWE II", "job_path": "/en/jobs/amz-2"}
        ]
    }
    page2_data = {
        "hits": 4,
        "jobs": [
            {"id_icims": "amz-3", "title": "SWE III", "job_path": "/en/jobs/amz-3"},
            {"id_icims": "amz-4", "title": "Principal SWE", "job_path": "/en/jobs/amz-4"}
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        offset = request.url.params.get("offset")
        if offset == "2":
            return httpx.Response(200, json=page2_data)
        return httpx.Response(200, json=page1_data)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        source = AmazonJobsSource(client=client)
        pipeline = JobScrapingPipeline(amazon_source=source)

        result = await pipeline.scrape_amazon(
            category="software-development",
            result_limit=2,
            max_pages=2
        )

        assert result.total_fetched == 4
        assert result.total_valid == 4
        assert len(result.jobs) == 4
        assert [j.external_id for j in result.jobs] == ["amz-1", "amz-2", "amz-3", "amz-4"]


@pytest.mark.asyncio
async def test_amazon_http_errors_and_malformed_json():
    # 404
    t404 = httpx.MockTransport(lambda req: httpx.Response(404, text="Not Found"))
    async with httpx.AsyncClient(transport=t404) as client:
        source = AmazonJobsSource(client=client)
        pipeline = JobScrapingPipeline(amazon_source=source)
        res = await pipeline.scrape_amazon()
        assert len(res.errors) > 0
        assert "not found" in res.errors[0].lower()

    # 429 Rate Limit
    t429 = httpx.MockTransport(lambda req: httpx.Response(429, text="Too Many Requests"))
    async with httpx.AsyncClient(transport=t429) as client:
        source = AmazonJobsSource(client=client)
        pipeline = JobScrapingPipeline(amazon_source=source)
        res = await pipeline.scrape_amazon()
        assert len(res.errors) > 0
        assert "rate limit" in res.errors[0].lower()

    # Malformed JSON
    tbad = httpx.MockTransport(lambda req: httpx.Response(200, text="Not valid json"))
    async with httpx.AsyncClient(transport=tbad) as client:
        source = AmazonJobsSource(client=client)
        pipeline = JobScrapingPipeline(amazon_source=source)
        res = await pipeline.scrape_amazon()
        assert len(res.errors) > 0
        assert "non-json" in res.errors[0].lower()


@pytest.mark.asyncio
async def test_amazon_cli_execution_with_filter(tmp_path):
    sample_job = ScrapedJob(
        external_id="amz-cli-1",
        source="amazon",
        title="AI Research Intern",
        company="Amazon",
        url="https://www.amazon.jobs/en/jobs/amz-cli-1"
    )
    mock_result = ScrapeResult(
        source="amazon",
        board_identifier="software-development",
        total_fetched=1,
        total_valid=1,
        total_deduplicated=1,
        jobs=[sample_job]
    )

    out_file = str(tmp_path / "amz_output.json")
    with patch.object(JobScrapingPipeline, "scrape_amazon", return_value=mock_result):
        await run_cli(
            source_name="amazon",
            board_token="software-development",
            company="Amazon",
            output_path=out_file,
            filter_preset="early_career"
        )

    with open(out_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["status"] == "success"
    assert data["source"] == "amazon"
    assert data["jobs"][0]["title"] == "AI Research Intern"
