import hashlib
import logging
import re
from typing import List, Dict, Any, Optional
from .base_event import BaseEventSource
from app.scraper.models_events import ScrapedEvent

logger = logging.getLogger(__name__)

HACKEREARTH_CHROME_API = "https://www.hackerearth.com/chrome-extension/events/"

KNOWN_SKILLS = [
    "python", "javascript", "react", "node", "java", "c++", "machine learning",
    "ai", "data science", "blockchain", "solidity", "cloud", "aws", "docker",
    "kubernetes", "devops", "cybersecurity", "android", "ios", "flutter", "react native"
]


class HackerEarthSource(BaseEventSource):
    """
    Async scraper for HackerEarth events via Chrome extension public feed.
    """

    def __init__(self, usd_to_inr_rate: float = 83.0, **kwargs):
        super().__init__(**kwargs)
        self.usd_to_inr_rate = usd_to_inr_rate

    @property
    def source_name(self) -> str:
        return "hackerearth"

    async def fetch_raw_jobs(self, board_identifier: str = "all", **kwargs) -> List[Dict[str, Any]]:
        try:
            response = await self._make_request(HACKEREARTH_CHROME_API)
            data = response.json()
        except Exception as e:
            logger.error(f"[hackerearth] Error fetching events feed: {e}")
            return []

        events = data if isinstance(data, list) else data.get("response", [])
        return events

    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedEvent]:
        title = raw_data.get("title") or "HackerEarth Challenge"
        url = raw_data.get("url") or raw_data.get("challenge_url") or "https://www.hackerearth.com/challenges/"

        url_slug = url.rstrip("/").split("/")[-1] if "/" in url else ""
        ext_id = url_slug if url_slug and len(url_slug) > 3 else hashlib.md5(title.encode()).hexdigest()[:16]

        desc_raw = raw_data.get("description") or raw_data.get("overview") or title
        cleaned_desc = self.clean_html(desc_raw)

        is_onsite = any(kw in title.lower() or kw in cleaned_desc.lower() for kw in ("onsite", "in-person", "offline"))
        mode = "onsite" if is_onsite else "online"
        raw_location = "Onsite" if is_onsite else "Online"
        loc_norm = self.normalize_location(raw_location)

        organizer = company_name
        if not organizer:
            if ":" in title:
                organizer = title.split(":")[0].strip()
            elif " by " in title.lower():
                organizer = title.lower().split(" by ")[-1].strip().title()
            else:
                organizer = raw_data.get("company_name") or "HackerEarth Partner"

        start_date = self.parse_iso_date(raw_data.get("start_utc_tz") or raw_data.get("start_timestamp"))
        end_date = self.parse_iso_date(raw_data.get("end_utc_tz") or raw_data.get("end_timestamp"))

        matched_skills = [s.title() for s in KNOWN_SKILLS if s in cleaned_desc.lower() or s in title.lower()]
        if not matched_skills:
            matched_skills = ["Competitive Programming", "Software Engineering"]

        prize_raw = raw_data.get("prizes") or raw_data.get("prize_amount") or ""
        prize_str = str(prize_raw) if prize_raw else None

        return ScrapedEvent(
            external_id=ext_id,
            source=self.source_name,
            title=title,
            organizer=organizer,
            location=raw_location,
            city=loc_norm.get("city"),
            state=loc_norm.get("state"),
            country=loc_norm.get("country"),
            mode=mode,
            description=cleaned_desc,
            url=url,
            prize_pool=prize_str,
            event_start_date=start_date,
            event_end_date=end_date,
            skills=matched_skills,
            cover_image=raw_data.get("thumbnail_url") or raw_data.get("cover_image")
        )
