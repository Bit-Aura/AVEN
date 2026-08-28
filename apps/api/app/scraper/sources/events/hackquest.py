import logging
import re
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
from .base_event import BaseEventSource
from app.scraper.models_events import ScrapedEvent

logger = logging.getLogger(__name__)

HACKQUEST_URL = "https://www.hackquest.io/en/hackathons"


class HackQuestSource(BaseEventSource):
    """
    Async scraper for HackQuest Web3/Tech hackathon platform.
    Uses BeautifulSoup to parse server-rendered HTML cards.
    """

    @property
    def source_name(self) -> str:
        return "hackquest"

    async def fetch_raw_jobs(self, board_identifier: str = "all", **kwargs) -> List[Dict[str, Any]]:
        url = kwargs.get("url") or HACKQUEST_URL
        try:
            response = await self._make_request(url)
            html = response.text
        except Exception as e:
            logger.error(f"[hackquest] Error fetching HTML page: {e}")
            return []

        soup = BeautifulSoup(html, "html.parser")
        raw_cards: List[Dict[str, Any]] = []

        card_elements = soup.select("a[href*='/hackathons/']") or soup.find_all("div", class_=re.compile(r"card|grid|rounded"))

        visited_urls = set()
        for el in card_elements:
            href = el.get("href") if el.name == "a" else (el.find("a") or {}).get("href")
            if not href or href in visited_urls or "/hackathons/" not in href or href.endswith("/hackathons/"):
                continue

            visited_urls.add(href)
            full_url = href if href.startswith("http") else f"https://www.hackquest.io{href}"
            slug = href.rstrip("/").split("/")[-1]

            title_el = el.select_one("h2, h3, [class*='title']")
            title_text = title_el.get_text(strip=True) if title_el else slug.replace("-", " ").title()

            desc_el = el.select_one("p, [class*='body'], [class*='desc']")
            desc_text = desc_el.get_text(strip=True) if desc_el else f"Hackathon on HackQuest: {title_text}"

            prize_el = el.select_one("[class*='prize'], [class*='reward']")
            prize_text = prize_el.get_text(strip=True) if prize_el else None

            raw_cards.append({
                "slug": slug,
                "url": full_url,
                "title": title_text,
                "description": desc_text,
                "prize": prize_text,
                "raw_html": str(el)
            })

        return raw_cards

    def extract_job(self, raw_data: Dict[str, Any], company_name: Optional[str] = None) -> Optional[ScrapedEvent]:
        slug = raw_data.get("slug")
        if not slug:
            return None

        title = raw_data.get("title") or slug.replace("-", " ").title()
        url = raw_data.get("url") or f"https://www.hackquest.io/en/hackathons/{slug}"
        cleaned_desc = self.clean_html(raw_data.get("description"))

        prize_raw = raw_data.get("prize")
        prize_pool = self.clean_html(prize_raw) if prize_raw else None

        organizer = company_name or "HackQuest Partner"
        raw_location = "Online"
        loc_norm = self.normalize_location(raw_location)

        return ScrapedEvent(
            external_id=slug,
            source=self.source_name,
            title=title,
            organizer=organizer,
            location=raw_location,
            city=loc_norm.get("city"),
            state=loc_norm.get("state"),
            country=loc_norm.get("country"),
            mode="online",
            description=cleaned_desc,
            url=url,
            prize_pool=prize_pool,
            skills=["Web3", "Blockchain", "Hackathon"]
        )
