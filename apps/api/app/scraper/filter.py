import re
import logging
from typing import List, Dict, Set, Optional, Tuple, Any
from pydantic import BaseModel, Field, ConfigDict

from .models import ScrapedJob

logger = logging.getLogger(__name__)

# ====================================================================
# Default Keyword Configurations
# ====================================================================

DEFAULT_CORE_AI_KEYWORDS = [
    "ai",
    "machine learning",
    "artificial intelligence",
    "deep learning",
    "computer vision",
    "natural language processing",
    "nlp",
    "generative ai",
    "genai",
    "gen ai",
    "llm",
    "large language model",
    "data science",
    "data scientist",
    "mlops",
    "ai engineer",
    "ml engineer",
    "ai researcher",
    "ai research",
    "machine learning engineer",
    "deep learning engineer",
    "computer vision engineer",
    "nlp engineer",
    "research intern",
    "ai intern",
    "machine learning intern",
    "prompt engineer",
    "reinforcement learning",
    "neural network",
    "neural networks",
    "pytorch",
    "tensorflow",
]

DEFAULT_TECH_KEYWORDS = [
    "software engineer",
    "software engineering",
    "swe",
    "backend engineer",
    "backend developer",
    "frontend engineer",
    "frontend developer",
    "full stack engineer",
    "fullstack engineer",
    "full stack developer",
    "data engineer",
    "data engineering",
    "data analyst",
    "cloud engineer",
    "devops engineer",
    "platform engineer",
    "site reliability engineer",
    "sre",
    "systems engineer",
    "infrastructure engineer",
    "applied scientist",
    "research scientist",
    "engineering manager",
]

DEFAULT_AMBIGUOUS_TECH_INDICATORS = [
    "intern",
    "internship",
    "co-op",
    "coop",
    "apprentice",
    "fellow",
    "fellowship",
    "engineer",
    "engineering",
    "developer",
    "scientist",
    "researcher",
    "research",
    "technologist",
    "consultant",
    "architect",
    "mts",
    "member of technical staff",
]

DEFAULT_EXCLUDE_DOMAIN_KEYWORDS = [
    "accountant",
    "accounting",
    "accounts receivable",
    "accounts payable",
    "bookkeeper",
    "clerk",
    "payroll",
    "billing clerk",
    "billing specialist",
    "billing coordinator",
    "billing manager",
    "financial analyst",
    "finance manager",
    "human resources",
    "hr manager",
    "hr coordinator",
    "hr specialist",
    "recruiter",
    "talent acquisition",
    "recruiting coordinator",
    "sales executive",
    "account executive",
    "sales representative",
    "sales manager",
    "sales development representative",
    "business development representative",
    "bdr",
    "sdr",
    "customer success manager",
    "customer support",
    "customer service",
    "support specialist",
    "office manager",
    "office administrator",
    "administrator",
    "executive assistant",
    "administrative assistant",
    "legal counsel",
    "paralegal",
    "attorney",
    "contract manager",
    "nurse",
    "physician",
    "cook",
    "chef",
    "driver",
    "warehouse associate",
    "civil engineer",
    "mechanical engineer",
    "chemical engineer",
    "construction manager",
    "real estate",
    "cashier",
    "event coordinator",
    "event manager",
    "content writer",
    "copywriter",
    "social media manager",
    "marketing coordinator",
    "marketing specialist",
    "marketing manager",
    "marketing lead",
    "content marketing",
    "graphic designer",
    "product designer",
    "ux designer",
    "ui designer",
    "visual designer",
    "design manager",
    "business services",
    "alliance director",
    "alliances leader",
    "facilities",
    "receptionist",
    "workplace",
    "procurement",
    "talent analytics",
]

DEFAULT_SENIOR_KEYWORDS = [
    "senior",
    "sr.",
    "sr",
    "staff",
    "principal",
    "director",
    "vice president",
    "vp",
    "head of",
    "chief",
    "lead",
    "architect",
    "distinguished",
    "fellow",
]


class FilterPolicy(BaseModel):
    """
    Configuration specification for the Universal Job Filter.
    Controls domain relevance, seniority thresholds, employment types, and data completeness.
    """
    name: str = "ai_technology"
    
    # 1. Validity / Completeness
    require_title: bool = True
    require_url: bool = False
    require_description: bool = False

    # 2. Employment Policy
    allowed_job_types: Optional[List[str]] = None  # None allows all types: ["internship", "full_time", "unknown", etc.]

    # 3. Seniority Exclusion Policy
    exclude_senior_roles: bool = False
    senior_keywords: List[str] = Field(default_factory=lambda: list(DEFAULT_SENIOR_KEYWORDS))

    # 4. Domain Relevance Policy
    core_ai_keywords: List[str] = Field(default_factory=lambda: list(DEFAULT_CORE_AI_KEYWORDS))
    tech_keywords: List[str] = Field(default_factory=lambda: list(DEFAULT_TECH_KEYWORDS))
    exclude_keywords: List[str] = Field(default_factory=lambda: list(DEFAULT_EXCLUDE_DOMAIN_KEYWORDS))
    ambiguous_tech_indicators: List[str] = Field(default_factory=lambda: list(DEFAULT_AMBIGUOUS_TECH_INDICATORS))
    
    # Relevance Thresholds
    min_domain_score: float = 1.0
    strict_ai_only: bool = False

    model_config = ConfigDict(extra="ignore")


class JobRejectionRecord(BaseModel):
    """
    Structured record explaining why an individual job was excluded by the filter.
    """
    external_id: str
    source: str
    title: str
    category: str
    reason: str

    model_config = ConfigDict(extra="ignore")


class FilterResult(BaseModel):
    """
    Structured output report of a filtering execution run.
    Provides explainability, counts, and accepted jobs pool.
    """
    policy_name: str = "ai_technology"
    total_input: int = 0
    accepted_count: int = 0
    rejected_count: int = 0
    rejection_summary: Dict[str, int] = Field(default_factory=dict)
    rejections: List[JobRejectionRecord] = Field(default_factory=list)
    jobs: List[ScrapedJob] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")


# ====================================================================
# Predefined Preset Policies
# ====================================================================

AI_TECH_POLICY = FilterPolicy(
    name="ai_technology",
    exclude_senior_roles=False,
    allowed_job_types=None,
    strict_ai_only=False,
)

EARLY_CAREER_AI_POLICY = FilterPolicy(
    name="early_career_ai",
    exclude_senior_roles=True,
    allowed_job_types=["internship", "full_time", "unknown", "part_time", "contract"],
    strict_ai_only=False,
)

STRICT_AI_POLICY = FilterPolicy(
    name="strict_ai_only",
    exclude_senior_roles=False,
    strict_ai_only=True,
    min_domain_score=2.0,
)


# ====================================================================
# Helper Scoring and Evaluation Functions
# ====================================================================

def _matches_word_boundaries(keyword: str, text: str) -> bool:
    """
    Matches keywords respecting word boundaries to prevent false substring matches (e.g. 'ai' in 'chair').
    """
    pattern = r"\b" + re.escape(keyword.lower()) + r"\b"
    return bool(re.search(pattern, text.lower()))


def _evaluate_validity(job: ScrapedJob, policy: FilterPolicy) -> Tuple[bool, Optional[str]]:
    """
    Category 1: Validity Filter.
    Checks required data integrity without rejecting optional missing fields.
    """
    if policy.require_title and (not job.title or not job.title.strip()):
        return False, "Missing or empty title."

    if not job.external_id or not str(job.external_id).strip():
        return False, "Missing or empty external_id."

    if not job.source or not job.source.strip():
        return False, "Missing or empty source identifier."

    if policy.require_url:
        if not job.url or not job.url.strip():
            return False, "Job missing required URL."

    if policy.require_description:
        if not job.description or not job.description.strip():
            return False, "Job missing required description."

    return True, None


def _evaluate_seniority(job: ScrapedJob, policy: FilterPolicy) -> Tuple[bool, Optional[str]]:
    """
    Category 3a: Seniority Policy Filter.
    Checks if job title contains configured senior indicators when senior exclusion is enabled.
    """
    if not policy.exclude_senior_roles:
        return True, None

    title_lower = (job.title or "").lower()
    for kw in policy.senior_keywords:
        if _matches_word_boundaries(kw, title_lower):
            return False, f"Seniority excluded: title matched senior keyword '{kw}'."

    return True, None


def _evaluate_job_type(job: ScrapedJob, policy: FilterPolicy) -> Tuple[bool, Optional[str]]:
    """
    Category 3b: Employment Type Policy Filter.
    Checks if job's normalized job_type matches the allowed list.
    """
    if policy.allowed_job_types is None:
        return True, None

    allowed_set = {jt.lower().strip() for jt in policy.allowed_job_types}
    current_type = (job.job_type or "unknown").lower().strip()

    if current_type not in allowed_set:
        return False, f"Job type '{current_type}' is not in allowed list {list(allowed_set)}."

    return True, None


def _evaluate_domain_relevance(job: ScrapedJob, policy: FilterPolicy) -> Tuple[bool, Optional[str]]:
    """
    Category 2: Role / Domain Relevance Filter.
    Computes a multi-signal explainable relevance score using title and description.
    Prevents company description boilerplate from falsely accepting non-technical roles.
    """
    title = (job.title or "").strip().lower()
    desc = (job.description or "").strip().lower()

    # 1. Check title against explicit exclude keywords (e.g. Accountant, HR, Sales Executive, Office Administrator)
    for kw in policy.exclude_keywords:
        if _matches_word_boundaries(kw, title):
            # Guard: check if this is an AI/SWE role for that department, e.g. "Software Engineer - Sales Tech"
            has_tech_title_override = any(
                _matches_word_boundaries(tech_kw, title)
                for tech_kw in (policy.core_ai_keywords + policy.tech_keywords)
            )
            if not has_tech_title_override:
                return False, f"Domain excluded: title matches irrelevant domain signal '{kw}'."

    score = 0.0
    matched_signals: List[str] = []
    has_title_signal = False

    # 2. Check Core AI/ML keywords in Title (High weight: +3.0)
    for kw in policy.core_ai_keywords:
        if _matches_word_boundaries(kw, title):
            score += 3.0
            matched_signals.append(f"title_ai:{kw}")
            has_title_signal = True

    # 3. Check General Tech/Engineering keywords in Title (Medium weight: +2.0)
    if not policy.strict_ai_only:
        for kw in policy.tech_keywords:
            if _matches_word_boundaries(kw, title):
                score += 2.0
                matched_signals.append(f"title_tech:{kw}")
                has_title_signal = True

    # 4. Check if title is an ambiguous technical/research role (e.g. "Research Fellow", "Graduate Intern", "Systems Associate")
    is_ambiguous_tech_title = any(
        _matches_word_boundaries(indicator, title)
        for indicator in policy.ambiguous_tech_indicators
    )

    # 5. Check Description for genuine AI/ML/Tech concepts
    if desc:
        desc_ai_matches = 0
        for kw in policy.core_ai_keywords:
            if _matches_word_boundaries(kw, desc):
                desc_ai_matches += 1
                matched_signals.append(f"desc_ai:{kw}")
                if desc_ai_matches >= 3:
                    break

        if has_title_signal:
            # Title is already technical; description adds extra supporting score
            score += desc_ai_matches * 1.0
        elif is_ambiguous_tech_title:
            # Ambiguous title: description AI concepts elevate the role if genuine evidence exists
            score += desc_ai_matches * 1.0
            if not policy.strict_ai_only and desc_ai_matches == 0:
                for kw in policy.tech_keywords:
                    if _matches_word_boundaries(kw, desc):
                        score += 0.5
                        matched_signals.append(f"desc_tech:{kw}")
                        break
        # Note: If title is completely non-technical and not an ambiguous tech title, description boilerplate alone is not accepted

    # 6. Evaluate final score against threshold
    if score < policy.min_domain_score:
        return False, f"Domain relevance score ({score:.1f}) below threshold ({policy.min_domain_score:.1f})."

    return True, None


def filter_jobs(
    jobs: List[ScrapedJob],
    policy: Optional[FilterPolicy] = None
) -> FilterResult:
    """
    Source-agnostic universal job filtering layer.
    Filters normalized ScrapedJob instances according to explicit, configurable rules.
    Does not mutate the input job list or items.
    
    Args:
        jobs (List[ScrapedJob]): Input list of normalized job instances.
        policy (Optional[FilterPolicy]): Configurable filtering criteria. Defaults to AI_TECH_POLICY.
        
    Returns:
        FilterResult: Report containing accepted jobs and structured rejection summary.
    """
    active_policy = policy or AI_TECH_POLICY
    result = FilterResult(
        policy_name=active_policy.name,
        total_input=len(jobs)
    )

    accepted_jobs: List[ScrapedJob] = []

    for job in jobs:
        # Step 1: Validity Filter
        is_valid, val_reason = _evaluate_validity(job, active_policy)
        if not is_valid:
            cat = "invalid_record"
            result.rejection_summary[cat] = result.rejection_summary.get(cat, 0) + 1
            result.rejections.append(
                JobRejectionRecord(
                    external_id=str(job.external_id or "unknown"),
                    source=job.source or "unknown",
                    title=job.title or "",
                    category=cat,
                    reason=val_reason or "Invalid record integrity"
                )
            )
            continue

        # Step 2: Seniority Filter
        not_senior, sen_reason = _evaluate_seniority(job, active_policy)
        if not not_senior:
            cat = "senior_role"
            result.rejection_summary[cat] = result.rejection_summary.get(cat, 0) + 1
            result.rejections.append(
                JobRejectionRecord(
                    external_id=str(job.external_id),
                    source=job.source,
                    title=job.title,
                    category=cat,
                    reason=sen_reason or "Excluded senior role"
                )
            )
            continue

        # Step 3: Employment Type Filter
        type_ok, type_reason = _evaluate_job_type(job, active_policy)
        if not type_ok:
            cat = "disallowed_job_type"
            result.rejection_summary[cat] = result.rejection_summary.get(cat, 0) + 1
            result.rejections.append(
                JobRejectionRecord(
                    external_id=str(job.external_id),
                    source=job.source,
                    title=job.title,
                    category=cat,
                    reason=type_reason or "Job type not allowed"
                )
            )
            continue

        # Step 4: Domain Relevance Filter
        domain_ok, domain_reason = _evaluate_domain_relevance(job, active_policy)
        if not domain_ok:
            cat = "irrelevant_domain"
            result.rejection_summary[cat] = result.rejection_summary.get(cat, 0) + 1
            result.rejections.append(
                JobRejectionRecord(
                    external_id=str(job.external_id),
                    source=job.source,
                    title=job.title,
                    category=cat,
                    reason=domain_reason or "Irrelevant domain"
                )
            )
            continue

        # Accepted
        accepted_jobs.append(job)

    result.accepted_count = len(accepted_jobs)
    result.rejected_count = result.total_input - result.accepted_count
    result.jobs = accepted_jobs

    logger.info(
        f"Universal Job Filter [{active_policy.name}]: "
        f"Input={result.total_input}, Accepted={result.accepted_count}, "
        f"Rejected={result.rejected_count}, Rejections={result.rejection_summary}"
    )

    return result
