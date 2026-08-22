from typing import List, Set, Tuple
import logging
from .models import ScrapedJob

logger = logging.getLogger(__name__)

def deduplicate_jobs(jobs: List[ScrapedJob]) -> Tuple[List[ScrapedJob], int]:
    """
    Deduplicates a list of ScrapedJob instances in-memory.
    
    Identity criteria:
    1. Primary: (source, external_id)
    2. Fallback: (source, normalized_url)
    
    Returns:
        Tuple[List[ScrapedJob], int]: (deduplicated_jobs, count_of_duplicates_removed)
    """
    seen_identities: Set[str] = set()
    deduped_list: List[ScrapedJob] = []
    duplicate_count = 0

    for job in jobs:
        # Build unique identity key
        if job.external_id and str(job.external_id).strip():
            identity_key = f"{job.source}::id::{str(job.external_id).strip()}"
        elif job.url and job.url.strip():
            canonical_url = job.url.strip().lower().rstrip("/")
            identity_key = f"{job.source}::url::{canonical_url}"
        else:
            # Fallback to (source, title, company)
            identity_key = f"{job.source}::title_co::{job.title.strip().lower()}::{str(job.company or '').strip().lower()}"

        if identity_key in seen_identities:
            duplicate_count += 1
            logger.debug(f"Dropped duplicate job: {identity_key} ({job.title})")
            continue

        seen_identities.add(identity_key)
        deduped_list.append(job)

    return deduped_list, duplicate_count
