import logging
import re
from typing import List, Dict, Any, Optional
from .base_event import BaseEventSource
from app.scraper.models_events import ScrapedEvent

logger = logging.getLogger(__name__)

DEVPOST_API_URL = "https://devpost.com/api/hackathons"


class DevpostSource(BaseEventSource):
    """
    Async scraper for Devpost hackathon platform.
    Uses Devpost public API.
    """

    @property
    def source_name(self) -> str:
        return "devpost"

    async def fetch_raw_jobs(self, board_identifier: str = "open", **kwargs) -> List[Dict[str, Any]]:
        max_pages = kwargs.get("max_pages", 5)
        statuses = ["open", "upcoming"] if board_identifier in ("all", "open") else [board_identifier]
        raw_events: List[Dict[str, Any]] = []

        for status in statuses:
            page = 1
            while page <= max_pages:
                params = {
                    "status[]": status,
                    "page": page
                }
                try:
                    response = await self._make_request(DEVPOST_API_URL, params=params)
                    data = response.json()
                except Exception as e:
                    logger.error(f"[devpost] Error fetching page {page} for status {status}: {e}")
                    break

                hackathons = data.get("hackathons", [])
                if not hackathons:
                    break

                raw_events.extend(hackathons)

                meta = data.get("meta", {})
                total_count = meta.get("total_count", 0)
                per_page = meta.get("per_page", 15)
                if page * per_page >= total_count:
                    break

                page += 1
                await self._sleep()

        return raw_events

    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedEvent]:
        event_id = raw_data.get("id")
        if not event_id:
            return None

        title = raw_data.get("title") or "Devpost Hackathon"
        url = raw_data.get("url") or f"https://devpost.com/hackathons/{event_id}"
        
        organizer = company_name or raw_data.get("displayed_location", {}).get("icon") or "Devpost Host"
        
        location_str = str(raw_data.get("displayed_location", {}).get("location") or "").strip()
        is_online = "online" in location_str.lower() or not location_str
        mode = "online" if is_online else "onsite"
        raw_location = "Online" if is_online else location_str
        loc_norm = self.normalize_location(raw_location)

        themes = [t.get("name") for t in raw_data.get("themes", []) if isinstance(t, dict) and t.get("name")]
        themes_str = ", ".join(themes) if themes else "General Software Development"
        description = f"Hackathon hosted on Devpost. Themes: {themes_str}."

        prize_raw = raw_data.get("prize_amount") or ""
        clean_prize = self.clean_html(prize_raw) if prize_raw else None
        cover = raw_data.get("thumbnail_url")

        time_left = raw_data.get("time_left_to_submission") or ""
        reg_deadline = self.parse_iso_date(time_left)

        # Devpost submission date range
        submission_period = raw_data.get("submission_period_dates") or ""
        start_date, end_date = self.parse_date_range(submission_period)

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
            description=description,
            url=url,
            prize_pool=clean_prize,
            event_start_date=start_date,
            event_end_date=end_date,
            registration_deadline=reg_deadline,
            skills=themes if themes else ["Hackathon"],
            cover_image=cover
        )
