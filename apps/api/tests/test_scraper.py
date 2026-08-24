import pytest
import httpx
from datetime import datetime

from app.scraper.models import ScrapedJob, ScrapeResult
from app.scraper.normalizer import clean_html, detect_job_type, normalize_location, normalize_date
from app.scraper.validator import validate_scraped_job, construct_and_validate_job
from app.scraper.deduplicator import deduplicate_jobs
from app.scraper.sources.base import (
    BoardNotFoundError,
    RateLimitError,
    SourceHTTPError,
    MalformedSourceDataError,
)
from app.scraper.sources.greenhouse import GreenhouseSource
from app.scraper.pipeline import JobScrapingPipeline


# ====================================================================
# Unit Tests: Normalizer & Cleaner
# ====================================================================

def test_clean_html_stripping_and_entities():
    raw_html = "<div><p>Hello &amp; welcome to <b>Acme Corp</b>!</p><p>We offer:</p><ul><li>Competitive pay &amp; perks</li><li>Remote work</li></ul></div>"
    cleaned = clean_html(raw_html)
    assert cleaned is not None
    assert "Hello & welcome to Acme Corp!" in cleaned
    assert "• Competitive pay & perks" in cleaned
    assert "• Remote work" in cleaned
    assert "<p>" not in cleaned
    assert "<b>" not in cleaned
    assert "&amp;" not in cleaned


def test_clean_html_none_and_plain_text():
    assert clean_html(None) is None
    assert clean_html("") is None
    assert clean_html("   ") is None
    assert clean_html("Plain text without tags") == "Plain text without tags"


def test_detect_job_type():
    # Internship
    assert detect_job_type("Software Engineer Intern") == "internship"
    assert detect_job_type("Summer 2026 Co-op - Backend") == "internship"
    assert detect_job_type("Apprenticeship in Engineering") == "internship"
    
    # Contract
    assert detect_job_type("Python Developer (Contract)") == "contract"
    assert detect_job_type("Freelance Technical Writer") == "contract"
    assert detect_job_type("Temporary QA Engineer") == "contract"
    
    # Part-Time & Full-Time
    assert detect_job_type("Part-time Frontend Developer") == "part_time"
    assert detect_job_type("Full-Time Site Reliability Engineer") == "full_time"
    
    # Unknown (Conservative)
    assert detect_job_type("Senior Backend Architect") == "unknown"
    assert detect_job_type("Data Analyst") == "unknown"


def test_normalize_location():
    assert normalize_location({"name": "San Francisco, CA"}) == "San Francisco, CA"
    assert normalize_location({"name": "   Remote, US  "}) == "Remote, US"
    assert normalize_location({"name": None}) is None
    assert normalize_location("New York, NY") == "New York, NY"
    assert normalize_location(None) is None


def test_normalize_date():
    iso_date = "2026-08-20T14:30:00Z"
    normalized = normalize_date(iso_date)
    assert normalized is not None
    assert "2026-08-20T14:30:00" in normalized
    assert normalize_date(None) is None
    assert normalize_date("") is None


# ====================================================================
# Unit Tests: Validator & Deduplicator
# ====================================================================

def test_validate_scraped_job_success():
    job = ScrapedJob(
        external_id="12345",
        source="greenhouse",
        title="Backend Engineer",
        company="Acme Corp",
        location="Remote",
        url="https://boards.greenhouse.io/acme/jobs/12345"
    )
    is_valid, err = validate_scraped_job(job)
    assert is_valid is True
    assert err is None


def test_validate_scraped_job_missing_fields():
    # Empty title
    job_empty_title, err = construct_and_validate_job({
        "external_id": "123",
        "source": "greenhouse",
        "title": "   "
    })
    assert job_empty_title is None
    assert "title" in err.lower()


def test_deduplicate_jobs_in_memory():
    job1 = ScrapedJob(external_id="101", source="greenhouse", title="SWE", company="Acme", url="https://example.com/1")
    job2 = ScrapedJob(external_id="102", source="greenhouse", title="Data Eng", company="Acme", url="https://example.com/2")
    job3_duplicate = ScrapedJob(external_id="101", source="greenhouse", title="SWE (Updated)", company="Acme", url="https://example.com/1")

    deduped, removed_count = deduplicate_jobs([job1, job2, job3_duplicate])
    assert len(deduped) == 2
    assert removed_count == 1
    assert deduped[0].external_id == "101"
    assert deduped[1].external_id == "102"


# ====================================================================
# Unit Tests: Greenhouse Source & Mock Transport
# ====================================================================

@pytest.mark.asyncio
async def test_greenhouse_fetch_success_multiple_jobs():
    sample_response_data = {
        "jobs": [
            {
                "id": 1001,
                "title": "Backend Software Engineer",
                "updated_at": "2026-08-20T10:00:00Z",
                "location": {"name": "Remote - US"},
                "absolute_url": "https://boards.greenhouse.io/acme/jobs/1001",
                "content": "<p>We are seeking a <b>Backend Engineer</b>.</p>"
            },
            {
                "id": 1002,
                "title": "Machine Learning Intern",
                "updated_at": "2026-08-21T12:00:00Z",
                "location": {"name": "Austin, TX"},
                "absolute_url": "https://boards.greenhouse.io/acme/jobs/1002",
                "content": "<p>Summer internship for ML students.</p>"
            }
        ]
    }

    def handler(request: httpx.Request) -> httpx.Response:
        assert "boards-api.greenhouse.io" in str(request.url)
        assert "/acme/jobs" in str(request.url)
        assert request.url.params.get("content") == "true"
        return httpx.Response(200, json=sample_response_data)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        source = GreenhouseSource(client=client)
        pipeline = JobScrapingPipeline(greenhouse_source=source)
        
        result = await pipeline.scrape_greenhouse(board_token="acme", company_name="Acme Corp")
        
        assert result.total_fetched == 2
        assert result.total_valid == 2
        assert result.total_deduplicated == 2
        assert len(result.jobs) == 2
        
        # Validate job 1
        j1 = result.jobs[0]
        assert j1.external_id == "1001"
        assert j1.title == "Backend Software Engineer"
        assert j1.company == "Acme Corp"
        assert j1.location == "Remote - US"
        assert j1.job_type == "unknown"
        assert "Backend Engineer" in j1.description
        assert "<p>" not in j1.description

        # Validate job 2 (Internship detection)
        j2 = result.jobs[1]
        assert j2.external_id == "1002"
        assert j2.job_type == "internship"
        assert j2.location == "Austin, TX"


@pytest.mark.asyncio
async def test_greenhouse_missing_optional_location():
    sample_response_data = {
        "jobs": [
            {
                "id": 2001,
                "title": "Cloud Architect",
                "location": None, # Missing location
                "absolute_url": "https://boards.greenhouse.io/acme/jobs/2001",
                "content": "No location specified."
            }
        ]
    }

    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_response_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = GreenhouseSource(client=client)
        pipeline = JobScrapingPipeline(greenhouse_source=source)
        
        result = await pipeline.scrape_greenhouse(board_token="acme")
        assert result.total_valid == 1
        assert result.jobs[0].location is None


@pytest.mark.asyncio
async def test_greenhouse_empty_job_list():
    sample_response_data = {"jobs": []}

    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_response_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = GreenhouseSource(client=client)
        pipeline = JobScrapingPipeline(greenhouse_source=source)
        
        result = await pipeline.scrape_greenhouse(board_token="emptyboard")
        assert result.total_fetched == 0
        assert result.total_valid == 0
        assert len(result.jobs) == 0


@pytest.mark.asyncio
async def test_greenhouse_partial_tolerance_malformed_single_job():
    sample_response_data = {
        "jobs": [
            {
                # Malformed: missing "id"
                "title": "Broken Job",
                "content": "Broken"
            },
            {
                # Valid job
                "id": 3002,
                "title": "Reliable Software Engineer",
                "absolute_url": "https://boards.greenhouse.io/acme/jobs/3002",
                "content": "<p>Valid job content</p>"
            }
        ]
    }

    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_response_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = GreenhouseSource(client=client)
        pipeline = JobScrapingPipeline(greenhouse_source=source)
        
        result = await pipeline.scrape_greenhouse(board_token="acme")
        assert result.total_fetched == 2
        assert result.total_valid == 1
        assert len(result.jobs) == 1
        assert result.jobs[0].external_id == "3002"


@pytest.mark.asyncio
async def test_greenhouse_http_404_board_not_found():
    transport = httpx.MockTransport(lambda req: httpx.Response(404, text="Not Found"))
    async with httpx.AsyncClient(transport=transport) as client:
        source = GreenhouseSource(client=client)
        pipeline = JobScrapingPipeline(greenhouse_source=source)
        
        result = await pipeline.scrape_greenhouse(board_token="nonexistent_board_404")
        assert result.total_fetched == 0
        assert len(result.errors) > 0
        assert "not found" in result.errors[0].lower()


@pytest.mark.asyncio
async def test_greenhouse_http_429_rate_limit():
    transport = httpx.MockTransport(lambda req: httpx.Response(429, text="Rate Limit Exceeded"))
    async with httpx.AsyncClient(transport=transport) as client:
        source = GreenhouseSource(client=client)
        pipeline = JobScrapingPipeline(greenhouse_source=source)
        
        result = await pipeline.scrape_greenhouse(board_token="throttled_board")
        assert result.total_fetched == 0
        assert len(result.errors) > 0
        assert "rate limit" in result.errors[0].lower()


@pytest.mark.asyncio
async def test_greenhouse_http_500_server_error():
    transport = httpx.MockTransport(lambda req: httpx.Response(500, text="Internal Server Error"))
    async with httpx.AsyncClient(transport=transport) as client:
        source = GreenhouseSource(client=client)
        pipeline = JobScrapingPipeline(greenhouse_source=source)
        
        result = await pipeline.scrape_greenhouse(board_token="error_board")
        assert result.total_fetched == 0
        assert len(result.errors) > 0
        assert "500" in result.errors[0]


# ====================================================================
# Additional Review Verification Tests
# ====================================================================

def test_normalize_date_timezone_offset_and_invalid():
    # Offset -04:00 converts correctly to UTC +00:00
    offset_date = "2026-08-05T18:23:33-04:00"
    normalized = normalize_date(offset_date)
    assert normalized == "2026-08-05T22:23:33+00:00"

    # Missing and invalid dates return None (never invented)
    assert normalize_date(None) is None
    assert normalize_date("") is None
    assert normalize_date("not-a-valid-date") is None
    assert normalize_date(123456) is None


def test_clean_html_paragraph_separation():
    # Verify adjacent paragraphs do not concatenate without whitespace
    html_input = "<p>Hello</p><p>World</p>"
    cleaned = clean_html(html_input)
    assert cleaned == "Hello\n\nWorld"
    assert "HelloWorld" not in cleaned


def test_clean_html_headings_and_zero_width_spaces():
    html_input = "<h1>Job Title</h1><p>Description with \u200bzero-width\ufeff spaces &amp; &nbsp; entities.</p>"
    cleaned = clean_html(html_input)
    assert "Job Title" in cleaned
    assert "\u200b" not in cleaned
    assert "\ufeff" not in cleaned
    assert "&amp;" not in cleaned
    assert "&nbsp;" not in cleaned


def test_deduplicate_different_source_same_id():
    # Same ID across different sources must NOT be merged
    gh_job = ScrapedJob(external_id="101", source="greenhouse", title="SWE", company="Acme")
    lever_job = ScrapedJob(external_id="101", source="lever", title="SWE", company="Acme")

    deduped, removed = deduplicate_jobs([gh_job, lever_job])
    assert len(deduped) == 2
    assert removed == 0


def test_scrape_result_json_serialization():
    import json
    job = ScrapedJob(
        external_id="999",
        source="greenhouse",
        title="Staff Engineer",
        company="Acme",
        location=None,
        job_type="full_time",
        description="Line 1\n\nLine 2",
        url="https://example.com/job/999",
        posted_date="2026-08-20T12:00:00+00:00"
    )
    result = ScrapeResult(
        source="greenhouse",
        board_identifier="acme",
        total_fetched=1,
        total_valid=1,
        total_deduplicated=1,
        jobs=[job]
    )

    # 1. model_dump()
    data_dict = result.model_dump()
    assert isinstance(data_dict, dict)
    assert data_dict["jobs"][0]["location"] is None

    # 2. json.dumps()
    json_str = json.dumps(data_dict)
    assert isinstance(json_str, str)
    assert "Staff Engineer" in json_str

    # 3. model_dump_json()
    pydantic_json = result.model_dump_json()
    assert isinstance(pydantic_json, str)
    assert "Staff Engineer" in pydantic_json


@pytest.mark.asyncio
async def test_greenhouse_company_name_none_preservation():
    sample_response_data = {
        "jobs": [
            {
                "id": 5001,
                "title": "Systems Engineer",
                "content": "<p>Systems role</p>"
            }
        ]
    }
    transport = httpx.MockTransport(lambda req: httpx.Response(200, json=sample_response_data))
    async with httpx.AsyncClient(transport=transport) as client:
        source = GreenhouseSource(client=client)
        pipeline = JobScrapingPipeline(greenhouse_source=source)
        
        # When company_name is None, do not invent or guess
        result = await pipeline.scrape_greenhouse(board_token="someboard", company_name=None)
        assert result.total_valid == 1
        assert result.jobs[0].company is None


@pytest.mark.asyncio
async def test_cli_execution_to_file(tmp_path):
    import json
    from unittest.mock import patch
    from app.scraper.cli import run_cli

    sample_job = ScrapedJob(
        external_id="888",
        source="greenhouse",
        title="DevOps Engineer",
        company="Canonical",
        url="https://boards.greenhouse.io/canonical/jobs/888"
    )
    mock_result = ScrapeResult(
        source="greenhouse",
        board_identifier="canonical",
        total_fetched=1,
        total_valid=1,
        total_deduplicated=1,
        jobs=[sample_job]
    )

    out_file = str(tmp_path / "output.json")

    with patch.object(JobScrapingPipeline, "scrape_greenhouse", return_value=mock_result):
        await run_cli(
            source_name="greenhouse",
            board_token="canonical",
            company="Canonical",
            limit=1,
            output_path=out_file,
            pretty=True
        )

    with open(out_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["status"] == "success"
    assert data["returned_count"] == 1
    assert data["jobs"][0]["title"] == "DevOps Engineer"


# ====================================================================
# Integration & API Tests: Multi-Source Arbitrary Board Support
# ====================================================================

@pytest.mark.asyncio
async def test_api_get_scraper_sources():
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/scraper/sources")
        assert response.status_code == 200
        data = response.json()
        assert "sources" in data
        source_ids = [s["id"] for s in data["sources"]]
        assert "greenhouse" in source_ids
        assert "lever" in source_ids
        assert "ashby" in source_ids
        assert "amazon" in source_ids
        assert "google" in source_ids

        # Check greenhouse metadata
        gh = next(s for s in data["sources"] if s["id"] == "greenhouse")
        assert gh["supports_custom_token"] is True
        assert gh["requires_token"] is True


@pytest.mark.asyncio
async def test_api_scrape_arbitrary_board_success():
    """Verify arbitrary custom company tokens work end-to-end through the API endpoint with mocked transport."""
    from unittest.mock import patch
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    custom_job = ScrapedJob(
        external_id="cf-999",
        source="greenhouse",
        title="Edge Systems Engineer",
        company="Cloudflare",
        location="Austin, TX",
        job_type="full_time",
        url="https://boards.greenhouse.io/cloudflare/jobs/cf-999"
    )
    custom_result = ScrapeResult(
        source="greenhouse",
        board_identifier="cloudflare",
        total_fetched=1,
        total_valid=1,
        total_deduplicated=1,
        jobs=[custom_job],
        errors=[]
    )

    with patch.object(JobScrapingPipeline, "run_pipeline", return_value=custom_result):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            payload = {
                "source": "greenhouse",
                "board_token": "cloudflare",
                "company_name": "Cloudflare",
                "limit": 10
            }
            response = await ac.post("/api/v1/scraper/scrape", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert data["source"] == "greenhouse"
            assert data["board_identifier"] == "cloudflare"
            assert len(data["jobs"]) == 1
            assert data["jobs"][0]["company"] == "Cloudflare"
            assert data["jobs"][0]["title"] == "Edge Systems Engineer"
            assert data["errors"] == []


@pytest.mark.asyncio
async def test_api_scrape_empty_token_validation():
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "source": "greenhouse",
            "board_token": "   ",
            "company_name": "Test"
        }
        response = await ac.post("/api/v1/scraper/scrape", json=payload)
        assert response.status_code == 400
        assert "empty" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_api_scrape_board_not_found_error_propagation():
    """Verify external board 404 is recorded in result.errors without producing fake jobs."""
    from unittest.mock import patch
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    error_result = ScrapeResult(
        source="greenhouse",
        board_identifier="nonexistent_company_token_12345",
        total_fetched=0,
        total_valid=0,
        total_deduplicated=0,
        jobs=[],
        errors=["Greenhouse board token 'nonexistent_company_token_12345' was not found."]
    )

    with patch.object(JobScrapingPipeline, "run_pipeline", return_value=error_result):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            payload = {
                "source": "greenhouse",
                "board_token": "nonexistent_company_token_12345",
                "company_name": "NonExistent"
            }
            response = await ac.post("/api/v1/scraper/scrape", json=payload)
            assert response.status_code == 200
            data = response.json()
            assert len(data["jobs"]) == 0
            assert len(data["errors"]) == 1
            assert "not found" in data["errors"][0].lower()


