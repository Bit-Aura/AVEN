from typing import Tuple, Optional, Any, Dict
from pydantic import ValidationError
from .models import ScrapedJob

def validate_scraped_job(job: ScrapedJob) -> Tuple[bool, Optional[str]]:
    """
    Validates a normalized ScrapedJob instance against core integrity criteria.
    Returns: (is_valid: bool, error_message: Optional[str])
    """
    # 1. Source verification
    if not job.source or not job.source.strip():
        return False, "Missing or empty 'source' attribute."

    # 2. External ID verification
    if not job.external_id or not str(job.external_id).strip():
        return False, "Missing or empty 'external_id' attribute."

    # 3. Title verification
    if not job.title or not job.title.strip():
        return False, "Missing or empty 'title' attribute."

    # 4. Description type verification
    if job.description is not None and not isinstance(job.description, str):
        return False, "Description must be a string if provided."

    # 5. URL verification if provided
    if job.url is not None:
        if not isinstance(job.url, str) or not job.url.strip():
            return False, "URL must be a non-empty string when provided."

    return True, None


def construct_and_validate_job(payload: Dict[str, Any]) -> Tuple[Optional[ScrapedJob], Optional[str]]:
    """
    Safely instantiates a ScrapedJob model from a dictionary and validates it.
    Does not throw unhandled exceptions.
    """
    try:
        job = ScrapedJob(**payload)
        is_valid, reason = validate_scraped_job(job)
        if not is_valid:
            return None, reason
        return job, None
    except ValidationError as e:
        return None, f"Pydantic validation failed: {e.errors()}"
    except Exception as e:
        return None, f"Unexpected error constructing ScrapedJob: {str(e)}"
