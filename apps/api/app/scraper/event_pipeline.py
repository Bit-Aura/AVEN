import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
try:
    from rapidfuzz import fuzz
except ImportError:
    import difflib
    class FuzzFallback:
        @staticmethod
        def ratio(s1, s2):
            return difflib.SequenceMatcher(None, str(s1), str(s2)).ratio() * 100
    fuzz = FuzzFallback()
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.scraper.models_events import ScrapedEvent, EventScrapeResult
from app.scraper.sources.events.base_event import BaseEventSource, EventScraperException
from app.scraper.sources.events.devfolio import DevfolioSource
from app.scraper.sources.events.devpost import DevpostSource
from app.scraper.sources.events.hack2skill import Hack2SkillSource
from app.scraper.sources.events.hackerearth import HackerEarthSource
from app.scraper.sources.events.hackquest import HackQuestSource
from app.scraper.sources.events.lablab import LabLabSource
from app.scraper.sources.events.mlh import MLHSource
from app.scraper.sources.events.unstop import UnstopSource
from app.scraper.sources.events.whereuelevate import WhereUElevateSource
from app.scraper.sources.events.hackculture import HackCultureSource
from app.models.domain import HackathonEvent

logger = logging.getLogger(__name__)


def _extract_calendar_date(iso_date: Optional[str]) -> Optional[str]:
    """Extracts YYYY-MM-DD date prefix if present."""
    if not iso_date or len(iso_date) < 10:
        return None
    return iso_date[:10]


def deduplicate_events(events: List[ScrapedEvent]) -> Tuple[List[ScrapedEvent], int, List[str]]:
    """
    Two-pass deduplication for event records:
    1. Exact match on (source, external_id)
    2. RapidFuzz cross-source title similarity (>= 90%) AND matching calendar start date.
    Returns (unique_events, total_removed_count, audit_warnings).
    """
    # Pass 1: Exact match on (source, external_id)
    exact_seen = set()
    exact_deduped: List[ScrapedEvent] = []
    removed_count = 0
    warnings: List[str] = []

    for ev in events:
        key = (ev.source, ev.external_id)
        if key in exact_seen:
            removed_count += 1
            warnings.append(f"Exact duplicate removed: '{ev.title}' ({ev.source}:{ev.external_id})")
        else:
            exact_seen.add(key)
            exact_deduped.append(ev)

    # Pass 2: Fuzzy cross-source matching (fuzz.ratio >= 90% and same start date)
    final_unique: List[ScrapedEvent] = []
    for candidate in exact_deduped:
        is_fuzzy_dupe = False
        cand_date = _extract_calendar_date(candidate.event_start_date)

        for idx, existing in enumerate(final_unique):
            exist_date = _extract_calendar_date(existing.event_start_date)
            
            # Check calendar date match requirement if start dates are present
            same_date = (cand_date and exist_date and cand_date == exist_date) or (not cand_date and not exist_date)
            
            if same_date:
                sim_score = fuzz.ratio(candidate.title.lower(), existing.title.lower())
                if sim_score >= 90.0:
                    is_fuzzy_dupe = True
                    removed_count += 1
                    warnings.append(
                        f"Fuzzy duplicate (similarity {sim_score:.1f}%): '{candidate.title}' ({candidate.source}:{candidate.external_id}) "
                        f"superseded by '{existing.title}' ({existing.source}:{existing.external_id})"
                    )
                    # Keep most recent or existing record
                    break

        if not is_fuzzy_dupe:
            final_unique.append(candidate)

    return final_unique, removed_count, warnings


async def load_events(db: AsyncSession, events: List[ScrapedEvent]) -> Tuple[int, int, int]:
    """
    Persists/upserts ScrapedEvent records into hackathon_events database table atomically using ON CONFLICT DO UPDATE.
    Returns (total_loaded, total_inserted, total_updated).
    """
    if not events:
        return 0, 0, 0

    total_inserted = 0
    total_updated = 0
    dialect_name = db.bind.dialect.name if db.bind else "postgresql"

    for ev in events:
        if dialect_name == "postgresql":
            stmt = pg_insert(HackathonEvent).values(
                external_id=ev.external_id,
                source=ev.source,
                title=ev.title,
                organizer=ev.organizer,
                description=ev.description,
                url=ev.url,
                location=ev.location,
                city=ev.city,
                state=ev.state,
                country=ev.country,
                mode=ev.mode,
                prize_pool=ev.prize_pool,
                registration_deadline=ev.registration_deadline,
                event_start_date=ev.event_start_date,
                event_end_date=ev.event_end_date,
                skills=ev.skills,
                cover_image=ev.cover_image
            )

            upsert_stmt = stmt.on_conflict_do_update(
                constraint="uq_hackathon_event_source_extid",
                set_={
                    "title": stmt.excluded.title,
                    "organizer": stmt.excluded.organizer,
                    "description": stmt.excluded.description,
                    "url": stmt.excluded.url,
                    "location": stmt.excluded.location,
                    "city": stmt.excluded.city,
                    "state": stmt.excluded.state,
                    "country": stmt.excluded.country,
                    "mode": stmt.excluded.mode,
                    "prize_pool": stmt.excluded.prize_pool,
                    "registration_deadline": stmt.excluded.registration_deadline,
                    "event_start_date": stmt.excluded.event_start_date,
                    "event_end_date": stmt.excluded.event_end_date,
                    "skills": stmt.excluded.skills,
                    "cover_image": stmt.excluded.cover_image,
                    "scraped_at": datetime.now(timezone.utc)
                }
            ).returning(HackathonEvent.id, text("xmax"))

            res = await db.execute(upsert_stmt)
            row = res.first()
            if row:
                if str(row[1]) == "0":
                    total_inserted += 1
                else:
                    total_updated += 1

        else:
            # SQLite fallback for in-memory unit tests
            from sqlalchemy.dialects.sqlite import insert as sqlite_insert
            stmt = sqlite_insert(HackathonEvent).values(
                external_id=ev.external_id,
                source=ev.source,
                title=ev.title,
                organizer=ev.organizer,
                description=ev.description,
                url=ev.url,
                location=ev.location,
                city=ev.city,
                state=ev.state,
                country=ev.country,
                mode=ev.mode,
                prize_pool=ev.prize_pool,
                registration_deadline=ev.registration_deadline,
                event_start_date=ev.event_start_date,
                event_end_date=ev.event_end_date,
                skills=ev.skills,
                cover_image=ev.cover_image
            )
            check_stmt = select(HackathonEvent.id).where(
                HackathonEvent.source == ev.source,
                HackathonEvent.external_id == ev.external_id
            )
            exists = (await db.execute(check_stmt)).scalar() is not None
            if exists:
                total_updated += 1
            else:
                total_inserted += 1

            upsert_stmt = stmt.on_conflict_do_update(
                index_elements=["source", "external_id"],
                set_={
                    "title": stmt.excluded.title,
                    "organizer": stmt.excluded.organizer,
                    "description": stmt.excluded.description,
                    "url": stmt.excluded.url,
                    "location": stmt.excluded.location,
                    "city": stmt.excluded.city,
                    "state": stmt.excluded.state,
                    "country": stmt.excluded.country,
                    "mode": stmt.excluded.mode,
                    "prize_pool": stmt.excluded.prize_pool,
                    "registration_deadline": stmt.excluded.registration_deadline,
                    "event_start_date": stmt.excluded.event_start_date,
                    "event_end_date": stmt.excluded.event_end_date,
                    "skills": stmt.excluded.skills,
                    "cover_image": stmt.excluded.cover_image,
                }
            )
            await db.execute(upsert_stmt)

    await db.commit()
    total_loaded = total_inserted + total_updated
    return total_loaded, total_inserted, total_updated


class EventScrapingPipeline:
    """
    Independent orchestrator for fetching, extracting, normalizing, validating,
    deduplicating, and persisting hackathons and tech events.
    """

    def __init__(
        self,
        devfolio_source: Optional[DevfolioSource] = None,
        devpost_source: Optional[DevpostSource] = None,
        hack2skill_source: Optional[Hack2SkillSource] = None,
        hackerearth_source: Optional[HackerEarthSource] = None,
        hackquest_source: Optional[HackQuestSource] = None,
        lablab_source: Optional[LabLabSource] = None,
        mlh_source: Optional[MLHSource] = None,
        unstop_source: Optional[UnstopSource] = None,
        whereuelevate_source: Optional[WhereUElevateSource] = None,
        hackculture_source: Optional[HackCultureSource] = None,
    ):
        self.sources: Dict[str, BaseEventSource] = {
            "devfolio": devfolio_source or DevfolioSource(),
            "devpost": devpost_source or DevpostSource(),
            "hack2skill": hack2skill_source or Hack2SkillSource(),
            "hackerearth": hackerearth_source or HackerEarthSource(),
            "hackquest": hackquest_source or HackQuestSource(),
            "lablab": lablab_source or LabLabSource(),
            "mlh": mlh_source or MLHSource(),
            "unstop": unstop_source or UnstopSource(),
            "whereuelevate": whereuelevate_source or WhereUElevateSource(),
            "hackculture": hackculture_source or HackCultureSource(),
        }

    async def run_pipeline(
        self,
        source: BaseEventSource,
        board_identifier: str = "all",
        company_name: Optional[str] = None,
        db: Optional[AsyncSession] = None,
        **kwargs
    ) -> EventScrapeResult:
        """
        Executes end-to-end event scraping pipeline: fetch -> extract -> normalize -> validate -> dedup -> load.
        """
        result = EventScrapeResult(
            source=source.source_name,
            board_identifier=board_identifier
        )

        logger.info(f"Starting event scraping pipeline for source='{source.source_name}', identifier='{board_identifier}'...")

        raw_items: List[Dict[str, Any]] = []
        try:
            raw_items = await source.fetch_raw_jobs(board_identifier, **kwargs)
            result.total_fetched = len(raw_items)
            logger.info(f"Successfully fetched {len(raw_items)} raw event records from '{source.source_name}'.")
        except EventScraperException as e:
            logger.error(f"Event scraper error while fetching '{board_identifier}': {e}")
            result.errors.append(str(e))
            return result
        except Exception as e:
            logger.exception(f"Unexpected error while fetching events from '{board_identifier}': {e}")
            result.errors.append(f"Unexpected fetch error: {str(e)}")
            return result

        valid_events: List[ScrapedEvent] = []
        for index, raw_event in enumerate(raw_items):
            try:
                event = source.extract_job(raw_event, company_name=company_name)
                if event:
                    valid_events.append(event)
            except Exception as e:
                logger.warning(f"Error processing raw event at index {index}: {e}")
                result.errors.append(f"Item #{index} extraction error: {str(e)}")

        result.total_valid = len(valid_events)

        deduped_events, removed_dupes_count, dedup_warnings = deduplicate_events(valid_events)
        result.total_deduplicated = len(deduped_events)
        result.events = deduped_events
        result.warnings.extend(dedup_warnings)

        if db is not None:
            try:
                loaded, inserted, updated = await load_events(db, deduped_events)
                result.total_loaded = loaded
                result.total_inserted = inserted
                result.total_updated = updated
                logger.info(f"Database load complete: Loaded={loaded} (Inserted={inserted}, Updated={updated}).")
            except Exception as e:
                logger.exception(f"Error loading events into database: {e}")
                result.errors.append(f"Database load error: {str(e)}")

        logger.info(
            f"Event pipeline completed for '{source.source_name}': "
            f"Fetched={result.total_fetched}, Valid={result.total_valid}, "
            f"Deduplicated={result.total_deduplicated} (removed {removed_dupes_count} duplicates), "
            f"Loaded={result.total_loaded}."
        )

        return result

    async def scrape_source(
        self,
        source_name: str,
        board_identifier: str = "all",
        db: Optional[AsyncSession] = None,
        **kwargs
    ) -> EventScrapeResult:
        src_lower = source_name.lower().strip()
        source_adapter = self.sources.get(src_lower)
        if not source_adapter:
            raise ValueError(f"Unsupported event source '{source_name}'. Available: {list(self.sources.keys())}")
        return await self.run_pipeline(source=source_adapter, board_identifier=board_identifier, db=db, **kwargs)
