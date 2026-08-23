import pytest
import httpx
from bs4 import BeautifulSoup

from app.scraper.models import ScrapedJob, ScrapeResult
from app.scraper.sources.generic_html import StaticHTMLCareerSource, HTMLSelectorConfig
from app.scraper.sources.base import BoardNotFoundError, RateLimitError, SourceHTTPError
from app.scraper.pipeline import JobScrapingPipeline
from app.scraper.filter import AI_TECH_POLICY


def test_html_selector_config_validation():
    # Valid config
    config = HTMLSelectorConfig(
        company_name="Acme Corp",
        base_url="https://example.com/careers",
        job_container_selector=".job-card",
        title_selector=".job-title",
        link_selector=".job-link a"
    )
    assert config.company_name == "Acme Corp"
    assert config.is_detail_page_required is False

    # Invalid empty selector
    with pytest.raises(ValueError, match="Required CSS selector cannot be empty"):
        HTMLSelectorConfig(
            company_name="Acme",
            base_url="https://example.com/careers",
            job_container_selector="   ",
            title_selector=".title",
            link_selector="a"
        )

    # Invalid URL scheme
    with pytest.raises(ValueError, match="base_url must be a valid HTTP/HTTPS URL"):
        HTMLSelectorConfig(
            company_name="Acme",
            base_url="ftp://example.com/careers",
            job_container_selector=".card",
            title_selector=".title",
            link_selector="a"
        )


@pytest.mark.asyncio
async def test_static_html_pattern_a_inline_extraction():
    html_content = """
    <html>
        <body>
            <div class="career-list">
                <div class="job-card" data-id="job-101">
                    <h3 class="job-title">Senior Machine Learning Engineer</h3>
                    <a class="job-link" href="/jobs/101">Apply Now</a>
                    <span class="location">Remote, US</span>
                    <span class="dept">AI Research</span>
                    <span class="type">Full-Time</span>
                    <div class="desc"><p>Build scalable <b>ML systems</b> in PyTorch.</p></div>
                </div>
                <div class="job-card" data-id="job-102">
                    <h3 class="job-title">Software Engineer Intern</h3>
                    <a class="job-link" href="https://other.com/jobs/102">View Details</a>
                    <span class="location">San Francisco, CA</span>
                    <span class="dept">Engineering</span>
                    <span class="type">Internship</span>
                    <div class="desc"><p>Summer 2026 internship.</p></div>
                </div>
            </div>
        </body>
    </html>
    """

    config = HTMLSelectorConfig(
        company_name="Acme AI",
        base_url="https://example.com/careers",
        job_container_selector=".job-card",
        title_selector=".job-title",
        link_selector=".job-link",
        location_selector=".location",
        department_selector=".dept",
        job_type_selector=".type",
        description_selector=".desc"
    )

    transport = httpx.MockTransport(lambda req: httpx.Response(200, text=html_content))
    async with httpx.AsyncClient(transport=transport) as client:
        source = StaticHTMLCareerSource(config=config, client=client)
        pipeline = JobScrapingPipeline()

        result = await pipeline.run_pipeline(source=source, board_identifier="https://example.com/careers")

        assert result.total_fetched == 2
        assert result.total_valid == 2
        assert result.total_deduplicated == 2
        assert len(result.jobs) == 2

        # Job 1
        j1 = result.jobs[0]
        assert j1.external_id == "job-101"
        assert j1.title == "Senior Machine Learning Engineer"
        assert j1.company == "Acme AI"
        assert j1.url == "https://example.com/jobs/101"  # Relative resolved to absolute
        assert j1.location == "Remote, US"
        assert j1.job_type == "full_time"
        assert "Build scalable ML systems in PyTorch." in j1.description

        # Job 2
        j2 = result.jobs[1]
        assert j2.external_id == "job-102"
        assert j2.title == "Software Engineer Intern"
        assert j2.url == "https://other.com/jobs/102"  # Absolute preserved
        assert j2.location == "San Francisco, CA"
        assert j2.job_type == "internship"


@pytest.mark.asyncio
async def test_static_html_pattern_b_detail_page_extraction():
    listing_html = """
    <div class="jobs">
        <div class="job-item">
            <h2 class="title">Backend Developer</h2>
            <a class="apply-btn" href="/careers/backend-dev">Details</a>
            <span class="loc">Austin, TX</span>
        </div>
    </div>
    """

    detail_html = """
    <div class="job-detail">
        <h1>Backend Developer</h1>
        <div class="detail-description">
            <p>We are seeking a <b>Backend Developer</b> to build Python APIs.</p>
            <ul><li>FastAPI</li><li>PostgreSQL</li></ul>
        </div>
    </div>
    """

    def handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        if "backend-dev" in url_str:
            return httpx.Response(200, text=detail_html)
        return httpx.Response(200, text=listing_html)

    config = HTMLSelectorConfig(
        company_name="TechCorp",
        base_url="https://techcorp.com/careers",
        job_container_selector=".job-item",
        title_selector=".title",
        link_selector=".apply-btn",
        location_selector=".loc",
        is_detail_page_required=True,
        detail_description_selector=".detail-description"
    )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        source = StaticHTMLCareerSource(config=config, client=client)
        pipeline = JobScrapingPipeline()

        result = await pipeline.run_pipeline(source=source, board_identifier="https://techcorp.com/careers")

        assert result.total_valid == 1
        j = result.jobs[0]
        assert j.title == "Backend Developer"
        assert j.location == "Austin, TX"
        assert "Backend Developer to build Python APIs" in j.description
        assert "• FastAPI" in j.description


@pytest.mark.asyncio
async def test_static_html_deterministic_external_id():
    html_without_data_id = """
    <div class="item">
        <a class="link" href="/job/devops-123"><span class="title">DevOps Engineer</span></a>
    </div>
    """
    config = HTMLSelectorConfig(
        company_name="DevCorp",
        base_url="https://devcorp.com/jobs",
        job_container_selector=".item",
        title_selector=".title",
        link_selector=".link"
    )
    transport = httpx.MockTransport(lambda req: httpx.Response(200, text=html_without_data_id))
    async with httpx.AsyncClient(transport=transport) as client:
        source = StaticHTMLCareerSource(config=config, client=client)
        pipeline = JobScrapingPipeline()

        res1 = await pipeline.run_pipeline(source=source, board_identifier="https://devcorp.com/jobs")
        res2 = await pipeline.run_pipeline(source=source, board_identifier="https://devcorp.com/jobs")

        # Deterministic SHA-256 hash
        id1 = res1.jobs[0].external_id
        id2 = res2.jobs[0].external_id
        assert id1 == id2
        assert len(id1) == 16


@pytest.mark.asyncio
async def test_static_html_partial_detail_failure_tolerance():
    listing_html = """
    <div class="jobs">
        <div class="card"><h3 class="title">Good Job</h3><a class="link" href="/job/good">Link</a></div>
        <div class="card"><h3 class="title">Bad Detail Job</h3><a class="link" href="/job/bad">Link</a></div>
    </div>
    """
    def handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        if "/job/good" in url_str:
            return httpx.Response(200, text="<div class='desc'>Good detailed description</div>")
        elif "/job/bad" in url_str:
            return httpx.Response(500, text="Internal Server Error")
        return httpx.Response(200, text=listing_html)

    config = HTMLSelectorConfig(
        company_name="TestCorp",
        base_url="https://test.com/careers",
        job_container_selector=".card",
        title_selector=".title",
        link_selector=".link",
        is_detail_page_required=True,
        detail_description_selector=".desc"
    )

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        source = StaticHTMLCareerSource(config=config, client=client)
        pipeline = JobScrapingPipeline()
        result = await pipeline.run_pipeline(source=source, board_identifier="https://test.com/careers")

        assert result.total_valid == 2
        assert len(result.jobs) == 2
        assert "Good detailed description" in result.jobs[0].description
        assert result.jobs[1].description is None  # Failed detail page gracefully left None


@pytest.mark.asyncio
async def test_static_html_http_errors():
    config = HTMLSelectorConfig(
        company_name="ErrCorp",
        base_url="https://err.com/careers",
        job_container_selector=".card",
        title_selector=".title",
        link_selector=".link"
    )
    # 404
    transport_404 = httpx.MockTransport(lambda req: httpx.Response(404, text="Not Found"))
    async with httpx.AsyncClient(transport=transport_404) as client:
        source = StaticHTMLCareerSource(config=config, client=client)
        pipeline = JobScrapingPipeline()
        res = await pipeline.run_pipeline(source=source, board_identifier="https://err.com/careers")
        assert len(res.errors) > 0
        assert "404" in res.errors[0]
