import hashlib
import json
import logging
import re
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
from .base_event import BaseEventSource
from app.scraper.models_events import ScrapedEvent

logger = logging.getLogger(__name__)

WHEREUELEVATE_DRILLS_URL = "https://whereuelevate.com/drills"


class WhereUElevateSource(BaseEventSource):
    """
    Async scraper for Where U Elevate hackathons and drills.
    """

    @property
    def source_name(self) -> str:
        return "whereuelevate"

    async def fetch_raw_jobs(self, board_identifier: str = "all", **kwargs) -> List[Dict[str, Any]]:
        url = kwargs.get("url") or WHEREUELEVATE_DRILLS_URL
        try:
            response = await self._make_request(url)
            html = response.text
        except Exception as e:
            logger.error(f"[whereuelevate] Error fetching drills page: {e}")
            return []

        soup = BeautifulSoup(html, "html.parser")
        raw_events: List[Dict[str, Any]] = []

        for script in soup.find_all("script", type="application/ld+json"):
            if not script.string:
                continue
            try:
                data = json.loads(script.string)
                items = data.get("itemListElement", []) if isinstance(data, dict) else []
                for item in items:
                    ev = item.get("item", item)
                    if isinstance(ev, dict) and ev.get("name"):
                        raw_events.append(ev)
            except Exception:
                pass

        cards = soup.select("[data-slot='card'], .drill-card, a[href*='/drills/']")
        for card in cards:
            href = card.get("href") if card.name == "a" else (card.find("a") or {}).get("href")
            if not href:
                continue

            full_url = href if href.startswith("http") else f"https://whereuelevate.com{href}"
            title_el = card.select_one("p.font-semibold, h2, h3, .title")
            title = title_el.get_text(strip=True) if title_el else "Where U Elevate Challenge"

            mode_img = card.select_one("img[alt*='Mode'], img[alt*='mode']")
            mode_text = mode_img.get("alt", "") if mode_img else "Online"

            raw_events.append({
                "title": title,
                "url": full_url,
                "mode_text": mode_text,
                "raw_html": str(card)
            })

        return raw_events

    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedEvent]:
        title = raw_data.get("title") or raw_data.get("name")
        if not title:
            return None

        url = raw_data.get("url") or "https://whereuelevate.com/drills"
        ext_id = hashlib.md5(url.encode()).hexdigest()[:16]

        mode_text = str(raw_data.get("mode_text") or "").lower()
        is_online = "online" in mode_text or "virtual" in mode_text or not mode_text
        mode = "online" if is_online else "onsite"
        raw_location = "Online" if is_online else "India"
        loc_norm = self.normalize_location(raw_location)

        organizer = company_name or "Where U Elevate Partner"

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
            description="Innovation challenge or hackathon hosted on Where U Elevate.",
            url=url,
            prize_pool="See website for details",
            skills=["Innovation", "Technology"]
        )
