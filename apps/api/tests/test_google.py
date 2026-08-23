import pytest
import httpx
import json
from unittest.mock import patch

from app.scraper.models import ScrapedJob, ScrapeResult
from app.scraper.sources.google import GoogleCareersSource
from app.scraper.pipeline import JobScrapingPipeline
from app.scraper.cli import run_cli
from app.scraper.filter import AI_TECH_POLICY, STRICT_AI_POLICY


@pytest.mark.asyncio
async def test_google_careers_successful_extraction():
    sample_ds1_data = [
        [
            [
                "goog-101",
                "Machine Learning Staff Software Engineer",
                "https://www.google.com/about/careers/applications/signin?jobId=goog-101",
                [None, "<ul><li>Build LLM retrieval models</li><li>Scale transformer training</li></ul>"],
                [None, "<h3>Minimum qualifications:</h3><ul><li>8 years SWE</li><li>5 years ML</li></ul>"],
                "projects/...",
                None,
                None,
                None,
                [["Mountain View, CA, USA", ["1395 Charleston Rd"], "Mountain View", None, "CA", "US"]],
                [None, "<p>Join Google to build next-generation AI infrastructure.</p>"],
                [2],
                [1785753687, 964000000],  # Timestamp in seconds
                [1787236787, 806000000]
            ],
            [
                "goog-102",
                "AI Research Intern",
                "https://www.google.com/about/careers/applications/signin?jobId=goog-102",
                [None, "<ul><li>Develop computer vision algorithms</li></ul>"],
                [None, "<ul><li>Enrolled in PhD</li></ul>"],
                "projects/...",
                None,
                None,
                None,
                [["Zurich, Switzerland", None, "Zurich", None, None, "CH"]],
                [None, "<p>Summer research internship in deep learning.</p>"],
                [2, 3],
                [1785773514, 481000000],
                [1785773514, 481000000]
            ]
        ]
    ]

    html_payload = f"""
    <!doctype html>
    <html>
        <head>
            <script>
                AF_initDataCallback({{key: 'ds:1', hash: '2', data: {json.dumps(sample_ds1_data)}, sideChannel: {{}}}});
            </script>
        </head>
        <body><div id="app"></div></body>
    </html>
    """

    def handler(request: httpx.Request) -> httpx.Response:
        assert "google.com" in str(request.url)
        assert "/about/careers/applications/jobs/results/" in str(request.url)
        return httpx.Response(200, text=html_payload)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        source = GoogleCareersSource(client=client)
        pipeline = JobScrapingPipeline(google_source=source)

        result = await pipeline.scrape_google(query="machine learning", company_name="Google")

        assert result.total_fetched == 2
        assert result.total_valid == 2
        assert result.total_deduplicated == 2
        assert len(result.jobs) == 2

        # Job 1
        j1 = result.jobs[0]
        assert j1.external_id == "goog-101"
        assert j1.source == "google"
        assert j1.title == "Machine Learning Staff Software Engineer"
        assert j1.company == "Google"
        assert j1.location == "Mountain View, CA, USA"
        assert j1.url == "https://www.google.com/about/careers/applications/jobs/results/goog-101"
        assert "Join Google to build next-generation AI infrastructure." in j1.description
        assert "Responsibilities:" in j1.description
        assert "• Build LLM retrieval models" in j1.description
        assert "Qualifications:" in j1.description
        assert "• 5 years ML" in j1.description
        assert j1.posted_date is not None

        # Job 2
        j2 = result.jobs[1]
        assert j2.external_id == "goog-102"
        assert j2.title == "AI Research Intern"
        assert j2.job_type == "internship"
        assert j2.location == "Zurich, Switzerland"


@pytest.mark.asyncio
async def test_google_careers_pagination():
    page1_data = [[["g-1", "SWE 1", "url1"], ["g-2", "SWE 2", "url2"]]]
    page2_data = [[["g-3", "SWE 3", "url3"], ["g-4", "SWE 4", "url4"]]]

    def handler(request: httpx.Request) -> httpx.Response:
        page = request.url.params.get("page")
        data = page2_data if page == "2" else page1_data
        html = f"<script>AF_initDataCallback({{key: 'ds:1', hash: '1', data: {json.dumps(data)}, sideChannel: {{}}}});</script>"
        return httpx.Response(200, text=html)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        source = GoogleCareersSource(client=client)
        pipeline = JobScrapingPipeline(google_source=source)

        result = await pipeline.scrape_google(query="software", max_pages=2)

        assert result.total_fetched == 4
        assert result.total_valid == 4
        assert len(result.jobs) == 4
        assert [j.external_id for j in result.jobs] == ["g-1", "g-2", "g-3", "g-4"]


@pytest.mark.asyncio
async def test_google_careers_missing_callback_and_http_errors():
    # Missing callback returns 0 jobs cleanly
    t_empty = httpx.MockTransport(lambda req: httpx.Response(200, text="<html><body>No callbacks</body></html>"))
    async with httpx.AsyncClient(transport=t_empty) as client:
        source = GoogleCareersSource(client=client)
        pipeline = JobScrapingPipeline(google_source=source)
        res = await pipeline.scrape_google()
        assert res.total_fetched == 0
        assert len(res.jobs) == 0

    # 404
    t_404 = httpx.MockTransport(lambda req: httpx.Response(404, text="Not Found"))
    async with httpx.AsyncClient(transport=t_404) as client:
        source = GoogleCareersSource(client=client)
        pipeline = JobScrapingPipeline(google_source=source)
        res = await pipeline.scrape_google()
        assert len(res.errors) > 0
        assert "404" in res.errors[0]


@pytest.mark.asyncio
async def test_google_cli_execution_with_filter(tmp_path):
    sample_job = ScrapedJob(
        external_id="goog-cli-1",
        source="google",
        title="Deep Learning Engineer",
        company="Google",
        url="https://www.google.com/about/careers/applications/jobs/results/goog-cli-1"
    )
    mock_result = ScrapeResult(
        source="google",
        board_identifier="deep learning",
        total_fetched=1,
        total_valid=1,
        total_deduplicated=1,
        jobs=[sample_job]
    )

    out_file = str(tmp_path / "goog_output.json")
    with patch.object(JobScrapingPipeline, "scrape_google", return_value=mock_result):
        await run_cli(
            source_name="google",
            board_token="deep learning",
            company="Google",
            output_path=out_file,
            filter_preset="strict_ai"
        )

    with open(out_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data["status"] == "success"
    assert data["source"] == "google"
    assert data["jobs"][0]["title"] == "Deep Learning Engineer"
