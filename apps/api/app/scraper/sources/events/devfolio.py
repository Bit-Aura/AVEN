import logging
from typing import List, Dict, Any, Optional
from .base_event import BaseEventSource
from app.scraper.models_events import ScrapedEvent

logger = logging.getLogger(__name__)

DEVFOLIO_SEARCH_URL = "https://api.devfolio.co/api/search/hackathons"
DEVFOLIO_CATEGORIES = ["application_open", "upcoming"]


class DevfolioSource(BaseEventSource):
    """
    Async scraper for Devfolio hackathon platform.
    Uses Devfolio public search API.
    """

    @property
    def source_name(self) -> str:
        return "devfolio"

    async def fetch_raw_jobs(self, board_identifier: str = "all", **kwargs) -> List[Dict[str, Any]]:
        page_size = kwargs.get("page_size", 50)
        max_pages = kwargs.get("max_pages", 5)
        raw_events: List[Dict[str, Any]] = []

        categories = DEVFOLIO_CATEGORIES if board_identifier in ("all", "default") else [board_identifier]

        for category in categories:
            offset = 0
            page_count = 0
            while page_count < max_pages:
                payload = {
                    "type": category,
                    "location": [],
                    "from": offset,
                    "size": page_size
                }
                headers = {
                    "Referer": "https://devfolio.co/hackathons",
                    "Origin": "https://devfolio.co"
                }

                try:
                    response = await self._make_request(
                        DEVFOLIO_SEARCH_URL,
                        method="POST",
                        headers=headers,
                        json_data=payload
                    )
                    data = response.json()
                except Exception as e:
                    logger.error(f"[devfolio] Error fetching offset {offset} for category {category}: {e}")
                    break

                hits = data.get("hits", {}).get("hits", [])
                if not hits:
                    break

                for hit in hits:
                    source_doc = hit.get("_source", {})
                    if source_doc:
                        raw_events.append(source_doc)

                total_hits = data.get("hits", {}).get("total", {}).get("value", 0)
                offset += page_size
                page_count += 1
                if offset >= total_hits:
                    break

                await self._sleep()

        return raw_events

    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedEvent]:
        uuid = raw_data.get("uuid") or raw_data.get("slug")
        if not uuid:
            return None

        title = raw_data.get("name") or raw_data.get("title") or "Devfolio Hackathon"
        tagline = raw_data.get("tagline") or ""
        desc_text = raw_data.get("desc") or tagline
        cleaned_desc = self.clean_html(desc_text)

        subdomain = raw_data.get("subdomain")
        external_apply_url = raw_data.get("external_apply_url")
        url = external_apply_url or (f"https://{subdomain}.devfolio.co" if subdomain else "https://devfolio.co")

        is_online = raw_data.get("is_online", True)
        mode = "online" if is_online else "onsite"
        raw_location = "Online" if is_online else (raw_data.get("location") or "Onsite")
        loc_norm = self.normalize_location(raw_location)

        start_date = self.parse_iso_date(raw_data.get("starts_at"))
        end_date = self.parse_iso_date(raw_data.get("ends_at"))
        reg_end = self.parse_iso_date(raw_data.get("reg_ends_at") or raw_data.get("registrations_end_at") or raw_data.get("starts_at"))

        cover_img = raw_data.get("cover_img") or raw_data.get("logo")
        organizer = company_name or raw_data.get("organizer_name") or "Devfolio Organizer"

        return ScrapedEvent(
            external_id=str(uuid),
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
            event_start_date=start_date,
            event_end_date=end_date,
            registration_deadline=reg_end,
            cover_image=cover_img,
            skills=["Hackathon", "Software Engineering"]
        )
