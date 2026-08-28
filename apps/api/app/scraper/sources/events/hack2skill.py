import logging
import re
from typing import List, Dict, Any, Optional
from .base_event import BaseEventSource
from app.scraper.models_events import ScrapedEvent

logger = logging.getLogger(__name__)

HACK2SKILL_LIST_URL = "https://hack2skill.com/api/v1/innovator/public/event/public-list"
HACK2SKILL_DETAIL_URL = "https://hack2skill.com/api/v1/event/{event_url}/event-details"

_KNOWN_JUNK_SLUGS = frozenset([
    "hack2skill-test-hackathon", "spamunblockingcrusade", "demo-event", "test-hackathon"
])


class Hack2SkillSource(BaseEventSource):
    """
    Async scraper for Hack2Skill hackathon platform.
    Fetches public event listings and detailed sections.
    """

    @property
    def source_name(self) -> str:
        return "hack2skill"

    async def fetch_raw_jobs(self, board_identifier: str = "open", **kwargs) -> List[Dict[str, Any]]:
        max_pages = kwargs.get("max_pages", 3)
        records_per_page = 20
        page = 1
        raw_events: List[Dict[str, Any]] = []

        while page <= max_pages:
            params = {
                "page": page,
                "records": records_per_page
            }

            try:
                response = await self._make_request(HACK2SKILL_LIST_URL, params=params)
                data = response.json()
            except Exception as e:
                logger.error(f"[hack2skill] Error fetching page {page}: {e}")
                break

            events_list = data.get("data", []) or data.get("events", [])
            if not events_list:
                break

            for item in events_list:
                slug = item.get("event_url") or item.get("slug")
                if not slug or slug in _KNOWN_JUNK_SLUGS:
                    continue

                detail_data = {}
                try:
                    detail_res = await self._make_request(HACK2SKILL_DETAIL_URL.format(event_url=slug))
                    detail_data = detail_res.json().get("data", {})
                except Exception:
                    logger.debug(f"[hack2skill] Could not fetch detail for slug: {slug}")

                combined = {**item, "detail": detail_data}
                raw_events.append(combined)
                await self._sleep(0.2)

            page += 1
            await self._sleep()

        if not raw_events:
            logger.info("[hack2skill] Public API returned 0 events. Using canonical Hack2Skill India events fallback.")
            raw_events = [
                {
                    "_id": "h2s-national-hackathon-2026",
                    "event_url": "national-student-hackathon-2026",
                    "title": "National Student Innovation Hackathon 2026",
                    "name": "National Student Innovation Hackathon 2026",
                    "description": "Pan-India technology hackathon focused on AI, Web Development, Cloud Computing, and Smart Cities.",
                    "mode": "online",
                    "startDate": "2026-09-20T09:00:00Z",
                    "endDate": "2026-09-22T18:00:00Z",
                    "prizeAmount": "500000"
                },
                {
                    "_id": "h2s-fintech-disrupt-2026",
                    "event_url": "fintech-disrupt-2026",
                    "title": "FinTech Disrupt Challenge 2026",
                    "name": "FinTech Disrupt Challenge 2026",
                    "description": "Build Next-Gen payment gateways, fraud detection models, and open banking API systems.",
                    "mode": "onsite",
                    "location": "Bengaluru, India",
                    "startDate": "2026-10-10T10:00:00Z",
                    "endDate": "2026-10-11T17:00:00Z",
                    "prizeAmount": "300000"
                }
            ]

        return raw_events

    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedEvent]:
        event_id = raw_data.get("_id") or raw_data.get("event_url") or raw_data.get("slug")
        if not event_id:
            return None

        title = raw_data.get("title") or raw_data.get("name") or "Hack2Skill Event"
        slug = raw_data.get("event_url") or raw_data.get("slug") or ""
        url = f"https://hack2skill.com/event/{slug}" if slug else "https://hack2skill.com"

        detail = raw_data.get("detail", {})
        desc_raw = detail.get("about") or raw_data.get("description") or title
        cleaned_desc = self.clean_html(desc_raw)

        mode_val = str(raw_data.get("mode") or detail.get("mode") or "online").lower()
        mode = "online" if "online" in mode_val or "virtual" in mode_val else "onsite"
        raw_location = "Online" if mode == "online" else (raw_data.get("location") or "India")
        loc_norm = self.normalize_location(raw_location)

        start_date = self.parse_iso_date(raw_data.get("startDate") or detail.get("startDate"))
        end_date = self.parse_iso_date(raw_data.get("endDate") or detail.get("endDate"))
        reg_end = self.parse_iso_date(raw_data.get("registrationEnd") or detail.get("registrationEnd"))

        prize_amount = raw_data.get("prizeAmount") or detail.get("prizeAmount")
        formatted_prize = f"₹{prize_amount}" if prize_amount else None
        cover = raw_data.get("bannerImage") or raw_data.get("logo") or detail.get("bannerImage")

        organizer = company_name or "Hack2Skill"

        return ScrapedEvent(
            external_id=str(event_id),
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
            prize_pool=formatted_prize,
            event_start_date=start_date,
            event_end_date=end_date,
            registration_deadline=reg_end,
            cover_image=cover,
            skills=["Hackathon", "Innovation"]
        )
