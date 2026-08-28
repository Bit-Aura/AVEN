import logging
from typing import List, Dict, Any, Optional
from .base_event import BaseEventSource
from app.scraper.models_events import ScrapedEvent

logger = logging.getLogger(__name__)

UNSTOP_SEARCH_URL = "https://unstop.com/api/public/opportunity/search-result"


class UnstopSource(BaseEventSource):
    """
    Async scraper for Unstop opportunity search API.
    Fetches hackathons and competitive engineering challenges.
    """

    @property
    def source_name(self) -> str:
        return "unstop"

    async def fetch_raw_jobs(self, board_identifier: str = "hackathons", **kwargs) -> List[Dict[str, Any]]:
        page_size = kwargs.get("per_page", 20)
        max_pages = kwargs.get("max_pages", 5)
        raw_events: List[Dict[str, Any]] = []

        page = 1
        while page <= max_pages:
            params = {
                "opportunity": board_identifier,
                "oppstatus": "open",
                "page": page,
                "per_page": page_size
            }

            try:
                response = await self._make_request(UNSTOP_SEARCH_URL, params=params)
                data = response.json()
            except Exception as e:
                logger.error(f"[unstop] Error fetching page {page}: {e}")
                break

            opps_data = data.get("data", {})
            items = opps_data.get("data", []) if isinstance(opps_data, dict) else []
            if not items:
                break

            raw_events.extend(items)

            current_page = opps_data.get("current_page", page) if isinstance(opps_data, dict) else page
            last_page = opps_data.get("last_page", page) if isinstance(opps_data, dict) else page

            if current_page >= last_page:
                break

            page += 1
            await self._sleep()

        return raw_events

    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedEvent]:
        opp_id = raw_data.get("id")
        if not opp_id:
            return None

        title = raw_data.get("title") or raw_data.get("name") or "Unstop Opportunity"
        site_url = raw_data.get("site_url") or raw_data.get("seo_url")
        url = site_url if site_url and site_url.startswith("http") else f"https://unstop.com/{site_url}" if site_url else f"https://unstop.com/o/{opp_id}"

        organisation = raw_data.get("organisation", {})
        org_name = company_name or (organisation.get("name") if isinstance(organisation, dict) else None) or "Unstop Partner"

        details = raw_data.get("details") or raw_data.get("description") or title
        cleaned_desc = self.clean_html(details)

        job_detail = raw_data.get("jobDetail", {})
        work_type = str(job_detail.get("type") or raw_data.get("region") or "online").lower()
        is_online = "online" in work_type or "virtual" in work_type
        mode = "online" if is_online else "onsite"
        
        address_info = raw_data.get("address_with_country_logo") or {}
        raw_location = "Online" if is_online else (address_info.get("name") or "India")
        loc_norm = self.normalize_location(raw_location)

        start_date = self.parse_iso_date(raw_data.get("start_date") or raw_data.get("start_dt"))
        end_date = self.parse_iso_date(raw_data.get("end_date") or raw_data.get("end_dt"))
        reg_end = self.parse_iso_date(raw_data.get("regn_requirements", {}).get("end_regn_dt") or raw_data.get("end_regn_dt"))

        prizes = raw_data.get("prizes", [])
        prize_str = None
        if prizes and isinstance(prizes, list):
            cash_prizes = [f"Rank {p.get('rank')}: ₹{p.get('cash')}" for p in prizes if isinstance(p, dict) and p.get('cash')]
            if cash_prizes:
                prize_str = ", ".join(cash_prizes)

        cover = raw_data.get("logoUrl2") or raw_data.get("banner_image")

        return ScrapedEvent(
            external_id=str(opp_id),
            source=self.source_name,
            title=title,
            organizer=org_name,
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
            registration_deadline=reg_end,
            cover_image=cover,
            skills=["Hackathon", "Engineering Challenge"]
        )
