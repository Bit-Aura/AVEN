import pytest
from app.scraper.models import ScrapedJob, ScrapeResult
from app.scraper.sources.greenhouse import GreenhouseSource
from app.scraper.sources.lever import LeverSource
from app.scraper.filter import (
    FilterPolicy,
    FilterResult,
    filter_jobs,
    AI_TECH_POLICY,
    EARLY_CAREER_AI_POLICY,
    STRICT_AI_POLICY,
)
from app.scraper.pipeline import JobScrapingPipeline


def test_filter_relevant_ai_role_accepted():
    job = ScrapedJob(
        external_id="ai-1",
        source="greenhouse",
        title="Machine Learning Intern",
        company="Acme",
        location="Remote",
        job_type="internship",
        description="Develop state of the art deep learning models."
    )
    result = filter_jobs([job], policy=AI_TECH_POLICY)
    assert result.accepted_count == 1
    assert result.rejected_count == 0
    assert len(result.jobs) == 1
    assert result.jobs[0].title == "Machine Learning Intern"


def test_filter_irrelevant_role_rejected():
    job = ScrapedJob(
        external_id="irr-1",
        source="lever",
        title="Accountant",
        company="Acme",
        location="New York",
        job_type="full_time",
        description="Handle tax filings and reconciliations."
    )
    result = filter_jobs([job], policy=AI_TECH_POLICY)
    assert result.accepted_count == 0
    assert result.rejected_count == 1
    assert "irrelevant_domain" in result.rejection_summary
    assert result.rejection_summary["irrelevant_domain"] == 1
    assert len(result.rejections) == 1
    assert "accountant" in result.rejections[0].reason.lower()


def test_filter_ambiguous_title_with_ai_description_accepted():
    # Title is generic "Research Fellow" or "Graduate Intern", but description contains deep learning / NLP
    job = ScrapedJob(
        external_id="ambig-1",
        source="greenhouse",
        title="Graduate Research Fellow",
        company="Lab AI",
        job_type="full_time",
        description="Work with large language model architectures and natural language processing pipelines."
    )
    result = filter_jobs([job], policy=AI_TECH_POLICY)
    assert result.accepted_count == 1
    assert result.jobs[0].external_id == "ambig-1"


def test_filter_generic_python_alone_on_irrelevant_role_rejected():
    # Role is an accountant or sales executive who mentions Python once in spreadsheets
    job_acct = ScrapedJob(
        external_id="acct-py",
        source="lever",
        title="Senior Tax Accountant",
        company="FinCorp",
        description="Managing tax audits. Basic Python knowledge for Excel is a plus."
    )
    result = filter_jobs([job_acct], policy=AI_TECH_POLICY)
    assert result.accepted_count == 0
    assert result.rejected_count == 1
    assert result.rejection_summary["irrelevant_domain"] == 1


def test_filter_seniority_rejection_when_enabled():
    policy = FilterPolicy(exclude_senior_roles=True)
    senior_job = ScrapedJob(
        external_id="sen-1",
        source="greenhouse",
        title="Senior Machine Learning Engineer",
        company="Acme",
        job_type="full_time"
    )
    staff_job = ScrapedJob(
        external_id="sen-2",
        source="lever",
        title="Staff AI Scientist",
        company="Acme",
        job_type="full_time"
    )
    junior_job = ScrapedJob(
        external_id="jun-1",
        source="greenhouse",
        title="Machine Learning Engineer",
        company="Acme",
        job_type="full_time"
    )

    result = filter_jobs([senior_job, staff_job, junior_job], policy=policy)
    assert result.total_input == 3
    assert result.accepted_count == 1
    assert result.rejected_count == 2
    assert result.rejection_summary["senior_role"] == 2
    assert result.jobs[0].external_id == "jun-1"


def test_filter_internship_accepted_in_early_career_policy():
    job = ScrapedJob(
        external_id="int-1",
        source="lever",
        title="AI Intern",
        company="Robotics Co",
        job_type="internship"
    )
    result = filter_jobs([job], policy=EARLY_CAREER_AI_POLICY)
    assert result.accepted_count == 1
    assert result.jobs[0].job_type == "internship"


def test_filter_disallowed_job_type_rejected():
    policy = FilterPolicy(allowed_job_types=["internship", "part_time"])
    full_time_job = ScrapedJob(
        external_id="ft-1",
        source="greenhouse",
        title="Machine Learning Engineer",
        company="Acme",
        job_type="full_time"
    )
    result = filter_jobs([full_time_job], policy=policy)
    assert result.accepted_count == 0
    assert result.rejected_count == 1
    assert result.rejection_summary["disallowed_job_type"] == 1


def test_filter_unknown_job_type_allowed_by_default():
    job = ScrapedJob(
        external_id="unk-1",
        source="lever",
        title="Data Scientist",
        company="Acme",
        job_type="unknown"
    )
    result = filter_jobs([job], policy=AI_TECH_POLICY)
    assert result.accepted_count == 1


def test_filter_missing_optional_location_and_sparse_data_not_rejected():
    job = ScrapedJob(
        external_id="sparse-1",
        source="greenhouse",
        title="Deep Learning Engineer",
        company=None,
        location=None,
        description=None,
        url=None,
        posted_date=None
    )
    result = filter_jobs([job], policy=AI_TECH_POLICY)
    assert result.accepted_count == 1
    assert result.jobs[0].location is None
    assert result.jobs[0].company is None


def test_filter_validity_rejections():
    policy = FilterPolicy(require_url=True)
    # Missing title
    job_no_title = ScrapedJob(
        external_id="inv-1",
        source="greenhouse",
        title="   ",
        url="https://example.com/1"
    )
    # Missing URL when required
    job_no_url = ScrapedJob(
        external_id="inv-2",
        source="lever",
        title="ML Engineer",
        url=None
    )
    result = filter_jobs([job_no_title, job_no_url], policy=policy)
    assert result.total_input == 2
    assert result.accepted_count == 0
    assert result.rejected_count == 2
    assert result.rejection_summary["invalid_record"] == 2


def test_filter_works_identically_across_greenhouse_and_lever():
    gh_job = ScrapedJob(
        external_id="gh-1",
        source="greenhouse",
        title="Computer Vision Engineer",
        company="VisionCorp",
        job_type="full_time"
    )
    lever_job = ScrapedJob(
        external_id="lev-1",
        source="lever",
        title="Computer Vision Engineer",
        company="VisionCorp",
        job_type="full_time"
    )
    gh_irrelevant = ScrapedJob(
        external_id="gh-2",
        source="greenhouse",
        title="HR Manager",
        company="VisionCorp"
    )
    lever_irrelevant = ScrapedJob(
        external_id="lev-2",
        source="lever",
        title="HR Manager",
        company="VisionCorp"
    )

    result = filter_jobs([gh_job, lever_job, gh_irrelevant, lever_irrelevant], policy=AI_TECH_POLICY)
    assert result.total_input == 4
    assert result.accepted_count == 2
    assert result.rejected_count == 2
    assert {j.source for j in result.jobs} == {"greenhouse", "lever"}
    assert result.rejection_summary["irrelevant_domain"] == 2


def test_filter_immutability():
    original_jobs = [
        ScrapedJob(external_id="imm-1", source="greenhouse", title="NLP Engineer", location="Remote"),
        ScrapedJob(external_id="imm-2", source="lever", title="Recruiter", location="NY")
    ]
    orig_copy = [j.model_copy(deep=True) for j in original_jobs]

    result = filter_jobs(original_jobs, policy=AI_TECH_POLICY)
    
    # Verify input items were not mutated
    assert len(original_jobs) == 2
    for orig, expected in zip(original_jobs, orig_copy):
        assert orig.model_dump() == expected.model_dump()


def test_pipeline_filter_integration():
    pipeline = JobScrapingPipeline()
    jobs = [
        ScrapedJob(external_id="1", source="greenhouse", title="Data Scientist"),
        ScrapedJob(external_id="2", source="greenhouse", title="Accountant"),
    ]
    res = pipeline.filter(jobs, policy=AI_TECH_POLICY)
    assert isinstance(res, FilterResult)
    assert res.accepted_count == 1
    assert res.jobs[0].title == "Data Scientist"


def test_filter_strict_ai_policy():
    ai_job = ScrapedJob(
        external_id="strict-1",
        source="lever",
        title="Machine Learning Engineer",
        description="Deep learning models in PyTorch"
    )
    swe_job = ScrapedJob(
        external_id="strict-2",
        source="lever",
        title="Frontend Developer",
        description="Building UI with React"
    )

    result = filter_jobs([ai_job, swe_job], policy=STRICT_AI_POLICY)
    assert result.total_input == 2
    assert result.accepted_count == 1
    assert result.jobs[0].external_id == "strict-1"
    assert result.rejected_count == 1
    assert result.rejection_summary["irrelevant_domain"] == 1


def test_filter_tech_override_on_department_match():
    # Role is a Software Engineer for HR or Sales systems -> accepted because of tech title override
    job = ScrapedJob(
        external_id="over-1",
        source="greenhouse",
        title="Software Engineer - HR Platform",
        description="Develop internal tooling"
    )
    result = filter_jobs([job], policy=AI_TECH_POLICY)
    assert result.accepted_count == 1
    assert result.jobs[0].external_id == "over-1"


def test_filter_boilerplate_in_non_technical_role_rejected():
    # Office administrator or marketer with company description mentioning 'data science', 'cloud software', 'AI'
    job_admin = ScrapedJob(
        external_id="admin-1",
        source="greenhouse",
        title="Beijing Office Administrator",
        description="We are the publisher of Ubuntu, the leading platform for data science, cloud software, and AI."
    )
    job_mkt = ScrapedJob(
        external_id="mkt-1",
        source="greenhouse",
        title="Content Marketing Manager",
        description="We are an artificial intelligence and cloud computing software company."
    )
    result = filter_jobs([job_admin, job_mkt], policy=AI_TECH_POLICY)
    assert result.accepted_count == 0
    assert result.rejected_count == 2
    assert result.rejection_summary["irrelevant_domain"] == 2


def test_filter_ai_keyword_boundary_matches():
    # Role with isolated 'AI' in title
    ai_pm = ScrapedJob(
        external_id="ai-pm-1",
        source="lever",
        title="Product Manager - AI",
        description="Lead AI product initiatives."
    )
    result = filter_jobs([ai_pm], policy=AI_TECH_POLICY)
    assert result.accepted_count == 1
    assert result.jobs[0].title == "Product Manager - AI"



@pytest.mark.asyncio
async def test_pipeline_scrape_greenhouse_and_lever_with_filter_policy():
    import httpx
    gh_data = {
        "jobs": [
            {"id": 1, "title": "AI Engineer", "absolute_url": "https://example.com/1"},
            {"id": 2, "title": "Office Manager", "absolute_url": "https://example.com/2"}
        ]
    }
    lever_data = [
        {"id": "l1", "text": "Deep Learning Scientist", "hostedUrl": "https://example.com/l1"},
        {"id": "l2", "text": "Senior Legal Counsel", "hostedUrl": "https://example.com/l2"}
    ]

    gh_client = httpx.AsyncClient(transport=httpx.MockTransport(lambda req: httpx.Response(200, json=gh_data)))
    lev_client = httpx.AsyncClient(transport=httpx.MockTransport(lambda req: httpx.Response(200, json=lever_data)))

    gh_source = GreenhouseSource(client=gh_client)
    lev_source = LeverSource(client=lev_client)
    pipeline = JobScrapingPipeline(greenhouse_source=gh_source, lever_source=lev_source)

    # 1. Scrape greenhouse with AI_TECH_POLICY
    res_gh = await pipeline.scrape_greenhouse("acme", filter_policy=AI_TECH_POLICY)
    assert res_gh.total_fetched == 2
    assert res_gh.total_valid == 2
    assert len(res_gh.jobs) == 1
    assert res_gh.jobs[0].title == "AI Engineer"

    # 2. Scrape lever with EARLY_CAREER_AI_POLICY (rejects Senior)
    res_lev = await pipeline.scrape_lever("acme", filter_policy=EARLY_CAREER_AI_POLICY)
    assert res_lev.total_fetched == 2
    assert res_lev.total_valid == 2
    assert len(res_lev.jobs) == 1
    assert res_lev.jobs[0].title == "Deep Learning Scientist"

