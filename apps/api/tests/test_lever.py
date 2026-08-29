import pytest
import httpx
import json
from unittest.mock import patch

from app.scraper.models import ScrapedJob, ScrapeResult
from app.scraper.sources.lever import LeverSource
from app.scraper.pipeline import JobScrapingPipeline
from app.scraper.cli import run_cli
from app.scraper.sources.base import (
    BoardNotFoundError,
    RateLimitError,
    SourceHTTPError,
    MalformedSourceDataError,
)


@pytest.mark.asyncio
async def test_lever_fetch_success_multiple_jobs():
    sample_response_data = [
        {
            "id": "lever-001",
            "text": "Machine Learning Engineer",
            "createdAt": 1711403416463,
            "categories": {
                "location": "San Francisco, CA",
                "commitment": "Full-time",
                "team": "AI Research"
            },
            "hostedUrl": "https://jobs.lever.co/palantir/lever-001",
            "description": "<p>We are looking for a <b>Machine Learning Engineer</b>.</p>",
            "lists": [
                {
                    "text": "Requirements",
                    "content": "<li>Python, PyTorch</li>"
                }
            ]
        },
        {
            "id": "lever-002",
            "text": "AI Research Intern",
            "createdAt": 1711500000000,
            "categories": {
                "location": "New York, NY",
                "commitment": "Intern"
            },
            "hostedUrl": "https://jobs.lever.co/palantir/lever-002",
            "descriptionPlain": "Summer internship in deep learning."
        }
    ]

    def handler(request: httpx.Request) -> httpx.Response:
        assert "api.lever.co" in str(request.url)
        assert "/v0/postings/palantir" in str(request.url)
        assert request.url.params.get("mode") == "json"
        return httpx.Response(200, json=sample_response_data)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)

        result = await pipeline.scrape_lever(site="palantir", company_name="Palantir")

        assert result.total_fetched == 2
        assert result.total_valid == 2
        assert result.total_deduplicated == 2
        assert len(result.jobs) == 2

        # Job 1 validation
        j1 = result.jobs[0]
        assert j1.external_id == "lever-001"
        assert j1.source == "lever"
        assert j1.title == "Machine Learning Engineer"
        assert j1.company == "Palantir"
        assert j1.location == "San Francisco, CA"
        assert j1.job_type == "full_time"
        assert j1.url == "https://jobs.lever.co/palantir/lever-001"
        assert j1.posted_date is not None
        assert "2024-03-25" in j1.posted_date  # 1711403416463 ms is March 25, 2024
        assert "Machine Learning Engineer" in j1.description
        assert "Requirements:" in j1.description
        assert "Python, PyTorch" in j1.description

        # Job 2 validation (Internship detection)
        j2 = result.jobs[1]
        assert j2.external_id == "lever-002"
        assert j2.title == "AI Research Intern"
        assert j2.job_type == "internship"
        assert j2.location == "New York, NY"
        assert j2.description == "Summer internship in deep learning."


@pytest.mark.asyncio
async def test_lever_html_description_cleaning():
    sample_data = [
        {
            "id": "lever-101",
            "text": "Frontend Developer",
            "description": "<div><h1>Role Overview</h1><p>Join our &amp; team!</p><ul><li>React</li><li>TypeScript</li></ul></div>",
            "hostedUrl": "https://jobs.lever.co/acme/lever-101"
        }
    ]
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)
        result = await pipeline.scrape_lever(site="acme")

        assert result.total_valid == 1
        desc = result.jobs[0].description
        assert "<p>" not in desc
        assert "<h1>" not in desc
        assert "&amp;" not in desc
        assert "Role Overview" in desc
        assert "Join our & team!" in desc
        assert "• React" in desc


@pytest.mark.asyncio
async def test_lever_missing_optional_location():
    sample_data = [
        {
            "id": "lever-201",
            "text": "Data Scientist",
            "categories": None,
            "hostedUrl": "https://jobs.lever.co/acme/lever-201"
        }
    ]
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)
        result = await pipeline.scrape_lever(site="acme")

        assert result.total_valid == 1
        assert result.jobs[0].location is None


@pytest.mark.asyncio
async def test_lever_missing_optional_description():
    sample_data = [
        {
            "id": "lever-301",
            "text": "DevOps Engineer",
            "hostedUrl": "https://jobs.lever.co/acme/lever-301"
        }
    ]
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)
        result = await pipeline.scrape_lever(site="acme")

        assert result.total_valid == 1
        assert result.jobs[0].description is None


@pytest.mark.asyncio
async def test_lever_missing_unknown_job_type():
    sample_data = [
        {
            "id": "lever-401",
            "text": "Backend Architect",
            "categories": {"commitment": None},
            "hostedUrl": "https://jobs.lever.co/acme/lever-401"
        }
    ]
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)
        result = await pipeline.scrape_lever(site="acme")

        assert result.total_valid == 1
        assert result.jobs[0].job_type == "unknown"


@pytest.mark.asyncio
async def test_lever_company_name_explicit_and_omitted():
    sample_data = [
        {
            "id": "lever-501",
            "text": "Security Specialist",
            "hostedUrl": "https://jobs.lever.co/acme/lever-501"
        }
    ]
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)

        # 1. Company name supplied explicitly
        result_explicit = await pipeline.scrape_lever(site="acme-corp", company_name="Acme Corp")
        assert result_explicit.jobs[0].company == "Acme Corp"

        # 2. Company name omitted remains None (never infer from slug "acme-corp")
        result_omitted = await pipeline.scrape_lever(site="acme-corp", company_name=None)
        assert result_omitted.jobs[0].company is None


@pytest.mark.asyncio
async def test_lever_original_external_id_and_url_preserved():
    sample_data = [
        {
            "id": "uuid-9876-abcd-5432",
            "text": "AI Engineer",
            "hostedUrl": "https://jobs.lever.co/myco/uuid-9876-abcd-5432",
            "applyUrl": "https://jobs.lever.co/myco/uuid-9876-abcd-5432/apply"
        }
    ]
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)
        result = await pipeline.scrape_lever(site="myco")

        assert result.jobs[0].external_id == "uuid-9876-abcd-5432"
        assert result.jobs[0].url == "https://jobs.lever.co/myco/uuid-9876-abcd-5432"


@pytest.mark.asyncio
async def test_lever_missing_source_date_remains_none():
    sample_data = [
        {
            "id": "lever-601",
            "text": "MLOps Engineer",
            "createdAt": None,
            "hostedUrl": "https://jobs.lever.co/acme/lever-601"
        }
    ]
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)
        result = await pipeline.scrape_lever(site="acme")

        assert result.jobs[0].posted_date is None


@pytest.mark.asyncio
async def test_lever_empty_response():
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=[]))
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)
        result = await pipeline.scrape_lever(site="emptyboard")

        assert result.total_fetched == 0
        assert result.total_valid == 0
        assert len(result.jobs) == 0


@pytest.mark.asyncio
async def test_lever_http_404_site_not_found():
    transport = httpx.MockTransport(lambda req: httpx.Response(404, text="Not Found"))
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)
        result = await pipeline.scrape_lever(site="nonexistent_lever_site")

        assert result.total_fetched == 0
        assert len(result.errors) > 0
        assert "not found" in result.errors[0].lower()


@pytest.mark.asyncio
async def test_lever_http_429_rate_limit():
    transport = httpx.MockTransport(lambda req: httpx.Response(429, text="Rate Limit Exceeded"))
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)
        result = await pipeline.scrape_lever(site="throttled_site")

        assert result.total_fetched == 0
        assert len(result.errors) > 0
        assert "rate limit" in result.errors[0].lower()


@pytest.mark.asyncio
async def test_lever_http_500_server_error():
    transport = httpx.MockTransport(lambda req: httpx.Response(500, text="Internal Server Error"))
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)
        result = await pipeline.scrape_lever(site="error_site")

        assert result.total_fetched == 0
        assert len(result.errors) > 0
        assert "500" in result.errors[0]


@pytest.mark.asyncio
async def test_lever_malformed_json():
    transport = httpx.MockTransport(lambda req: httpx.Response(200, text="This is not JSON"))
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)
        result = await pipeline.scrape_lever(site="badjson_site")

        assert result.total_fetched == 0
        assert len(result.errors) > 0
        assert "non-json" in result.errors[0].lower()


@pytest.mark.asyncio
async def test_lever_single_malformed_job_tolerance():
    sample_data = [
        {
            # Malformed item: missing id
            "text": "Requires Validation Job"
        },
        {
            # Malformed item: missing title/text
            "id": "lever-bad-2"
        },
        {
            # Valid item
            "id": "lever-good-3",
            "text": "Reliable AI Researcher",
            "hostedUrl": "https://jobs.lever.co/acme/lever-good-3"
        }
    ]
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = LeverSource(client=client)
        pipeline = JobScrapingPipeline(lever_source=source)
        result = await pipeline.scrape_lever(site="acme")

        assert result.total_fetched == 3
        assert result.total_valid == 1
        assert len(result.jobs) == 1
        assert result.jobs[0].external_id == "lever-good-3"


@pytest.mark.asyncio
async def test_lever_empty_board_identifier():
    source = LeverSource()
    with pytest.raises(ValueError, match="cannot be empty"):
        await source.fetch_raw_jobs("   ")


@pytest.mark.asyncio
async def test_lever_cli_execution_with_filter(tmp_path):
    sample_ai = ScrapedJob(
        external_id="l-ai",
        source="lever",
        title="Machine Learning Intern",
        url="https://jobs.lever.co/scale/l-ai"
    )
    sample_irr = ScrapedJob(
        external_id="l-irr",
        source="lever",
        title="Office Coordinator",
        url="https://jobs.lever.co/scale/l-irr"
    )
    mock_result = ScrapeResult(
        source="lever",
        board_identifier="scale",
        total_fetched=2,
        total_valid=2,
        total_deduplicated=2,
        jobs=[sample_ai, sample_irr]
    )

    out_file = str(tmp_path / "lever_filtered_output.json")

    with patch.object(JobScrapingPipeline, "scrape_lever", return_value=mock_result):
        await run_cli(
            source_name="lever",
            board_token="scale",
            company="Scale AI",
            output_path=out_file,
            filter_preset="early_career",
            exclude_senior=True
        )

    with open(out_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["status"] == "success"
    assert data["filter_applied"] == "early_career_ai"
