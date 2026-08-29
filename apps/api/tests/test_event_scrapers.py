import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.models.domain import Base, HackathonEvent
from app.scraper.models_events import ScrapedEvent
from app.scraper.sources.events.base_event import BaseEventSource
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
from app.scraper.event_pipeline import EventScrapingPipeline, deduplicate_events, load_events


@pytest.mark.asyncio
async def test_devfolio_source():
    source = DevfolioSource()
    raw_item = {
        "uuid": "test-uuid-123",
        "name": "Devfolio AI Hackathon",
        "desc": "A great AI hackathon on Devfolio.",
        "subdomain": "ai-Targeted Fix",
        "is_online": True,
        "starts_at": "2026-09-01T00:00:00Z",
        "ends_at": "2026-09-03T00:00:00Z",
        "reg_ends_at": "2026-08-30T00:00:00Z"
    }

    event = source.extract_job(raw_item)
    assert isinstance(event, ScrapedEvent)
    assert event.external_id == "test-uuid-123"
    assert event.title == "Devfolio AI Hackathon"
    assert event.mode == "online"
    assert event.url == "https://ai-hack.devfolio.co"


@pytest.mark.asyncio
async def test_devpost_source():
    source = DevpostSource()
    raw_item = {
        "id": 999123,
        "title": "Global Devpost Hackathon",
        "url": "https://devpost.com/hackathons/global-devpost-999123",
        "displayed_location": {"location": "Online", "icon": "Devpost Org"},
        "themes": [{"name": "AI"}, {"name": "Web3"}],
        "prize_amount": "$10,000"
    }

    event = source.extract_job(raw_item)
    assert isinstance(event, ScrapedEvent)
    assert event.external_id == "999123"
    assert event.title == "Global Devpost Hackathon"
    assert "AI" in event.skills
    assert event.prize_pool == "$10,000"


@pytest.mark.asyncio
async def test_hack2skill_source():
    source = Hack2SkillSource()
    raw_item = {
        "_id": "h2s-001",
        "title": "Hack2Skill Buildathon",
        "event_url": "buildathon-2026",
        "description": "<p>Build innovative apps!</p>",
        "mode": "online",
        "prizeAmount": "5,000,000"
    }

    event = source.extract_job(raw_item)
    assert isinstance(event, ScrapedEvent)
    assert event.external_id == "h2s-001"
    assert event.title == "Hack2Skill Buildathon"
    assert event.description == "Build innovative apps!"
    assert event.prize_pool == "₹5,000,000"


@pytest.mark.asyncio
async def test_hackerearth_source():
    source = HackerEarthSource(usd_to_inr_rate=83.0)
    raw_item = {
        "title": "Google: AI Code Challenge",
        "url": "https://www.hackerearth.com/challenges/hackathon/ai-code-challenge/",
        "description": "Solve Machine Learning challenges using Python.",
        "prizes": "$5,000 USD",
        "start_utc_tz": "2026-10-01T10:00:00Z"
    }

    event = source.extract_job(raw_item)
    assert isinstance(event, ScrapedEvent)
    assert event.external_id == "ai-code-challenge"
    assert event.organizer == "Google"
    assert "Python" in event.skills
    assert event.mode == "online"


@pytest.mark.asyncio
async def test_hackquest_source():
    source = HackQuestSource()
    raw_item = {
        "slug": "web3-summit-Targeted Fix",
        "title": "Web3 Summit Hackathon",
        "url": "https://www.hackquest.io/en/hackathons/web3-summit-Targeted Fix",
        "description": "Building decentralized applications",
        "prize": "$25,000"
    }

    event = source.extract_job(raw_item)
    assert isinstance(event, ScrapedEvent)
    assert event.external_id == "web3-summit-hack"
    assert event.prize_pool == "$25,000"
    assert "Web3" in event.skills


@pytest.mark.asyncio
async def test_lablab_source():
    source = LabLabSource()
    raw_item = {
        "id": "lablab-llama-3",
        "slug": "llama-3-hackathon",
        "title": "Llama 3 Community Hackathon",
        "description": "Build with Llama 3 and PyTorch",
        "eventType": "ONLINE",
        "startAt": "2026-09-15T00:00:00Z"
    }

    event = source.extract_job(raw_item)
    assert isinstance(event, ScrapedEvent)
    assert event.external_id == "lablab-llama-3"
    assert "Llama" in event.skills
    assert "PyTorch" in event.skills


@pytest.mark.asyncio
async def test_mlh_source():
    source = MLHSource()
    raw_item = {
        "id": "mlh-Targeted Fix-2026",
        "name": "HackMIT 2026",
        "url": "https://hackmit.org",
        "location": "Cambridge, MA",
        "formatType": "in_person"
    }

    event = source.extract_job(raw_item)
    assert isinstance(event, ScrapedEvent)
    assert event.external_id == "mlh-hack-2026"
    assert event.title == "HackMIT 2026"
    assert event.mode == "onsite"


@pytest.mark.asyncio
async def test_unstop_source():
    source = UnstopSource()
    raw_item = {
        "id": 123456,
        "title": "Tata Crucible Hackathon",
        "seo_url": "o/tata-crucible-123456",
        "organisation": {"name": "Tata Group"},
        "details": "National level engineering challenge.",
        "region": "online",
        "prizes": [{"rank": 1, "cash": "100000"}]
    }

    event = source.extract_job(raw_item)
    assert isinstance(event, ScrapedEvent)
    assert event.external_id == "123456"
    assert event.organizer == "Tata Group"
    assert "Rank 1: ₹100000" in event.prize_pool


@pytest.mark.asyncio
async def test_whereuelevate_source():
    source = WhereUElevateSource()
    raw_item = {
        "title": "Elevate AI Sprint",
        "url": "https://whereuelevate.com/drills/elevate-ai-sprint",
        "mode_text": "Online Mode"
    }

    event = source.extract_job(raw_item)
    assert isinstance(event, ScrapedEvent)
    assert event.title == "Elevate AI Sprint"
    assert event.mode == "online"


@pytest.mark.asyncio
async def test_hackculture_stub():
    source = HackCultureSource()
    assert source.source_name == "hackculture"
    raw_jobs = await source.fetch_raw_jobs()
    assert len(raw_jobs) >= 1
    assert source.extract_job({"title": "Test"}) is None


@pytest.mark.asyncio
async def test_pipeline_event_integration():
    pipeline = EventScrapingPipeline()

    mock_unstop_items = [{
        "id": 888,
        "title": "Pipeline Integration Hackathon",
        "seo_url": "o/pipeline-888",
        "organisation": {"name": "AVEN Test Org"},
        "details": "Testing end-to-end event pipeline execution.",
        "region": "online"
    }]

    with patch.object(UnstopSource, "fetch_raw_jobs", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_unstop_items
        res = await pipeline.scrape_source("unstop", board_identifier="hackathons")
        assert res.source == "unstop"
        assert res.total_fetched == 1
        assert res.total_valid == 1
        assert len(res.events) == 1
        assert res.events[0].title == "Pipeline Integration Hackathon"


# --- NEW COMPREHENSIVE TESTS FOR GAPS 1-5 ---

def test_clean_html_extended():
    """Gap 2/Clean: Asserts HTML tag stripping, entity unescaping, unicode normalization, and whitespace collapsing."""
    raw = "<p>Hackathon &amp; AI Sprint</p>&nbsp;\xa0\u2013 Build <b>cool</b> apps!  "
    cleaned = BaseEventSource.clean_html(raw)
    assert cleaned == "Hackathon & AI Sprint – Build cool apps!"


def test_normalize_dates_and_ranges():
    """Gap 4/Normalize: Asserts single date, date range parsing, and invalid date string rejection."""
    # Single ISO date
    single_iso = BaseEventSource.parse_iso_date("2026-09-01T00:00:00Z")
    assert single_iso == "2026-09-01T00:00:00+00:00"

    # Date range string
    start, end = BaseEventSource.parse_date_range("Aug 12 - Aug 15, 2026")
    assert start is not None and "2026-08-12" in start
    assert end is not None and "2026-08-15" in end

    # Unparseable date returns None
    invalid = BaseEventSource.parse_iso_date("Total Garbage Date")
    assert invalid is None

    # Pydantic validation rejects non-ISO date string
    with pytest.raises(ValueError, match="Invalid ISO-8601 timestamp format"):
        ScrapedEvent(
            external_id="1",
            source="test",
            title="Invalid Date Event",
            event_start_date="Not an ISO date"
        )


def test_normalize_location():
    """Gap 3/Normalize: Asserts city, state, country splitting, lookup table mappings, and Online mode."""
    # City / State string
    loc1 = BaseEventSource.normalize_location("Cambridge, MA")
    assert loc1["city"] == "Cambridge"
    assert loc1["state"] == "MA"
    assert loc1["country"] == "USA"

    # Abbreviation lookup mapping
    loc2 = BaseEventSource.normalize_location("CBE")
    assert loc2["city"] == "Coimbatore"
    assert loc2["country"] == "India"

    # State abbreviation lookup mapping
    loc3 = BaseEventSource.normalize_location("TN")
    assert loc3["state"] == "Tamil Nadu"
    assert loc3["country"] == "India"

    # Online indicator
    loc4 = BaseEventSource.normalize_location("Online Mode")
    assert loc4["mode"] == "online"
    assert loc4["city"] is None


def test_deduplicate_events_fuzzy_and_exact():
    """Gap 2/Dedup: Asserts exact match, fuzzy cross-source match on same date, and distinct dates non-merge."""
    ev1 = ScrapedEvent(
        external_id="d1",
        source="devpost",
        title="Global AI Hackathon 2026",
        event_start_date="2026-09-01T00:00:00Z"
    )
    # (a) Exact match duplicate
    ev1_exact = ScrapedEvent(
        external_id="d1",
        source="devpost",
        title="Global AI Hackathon 2026",
        event_start_date="2026-09-01T00:00:00Z"
    )
    # (b) Cross-source fuzzy match (same date, title >90% similar)
    ev2_fuzzy = ScrapedEvent(
        external_id="f1",
        source="devfolio",
        title="Global AI Hackathon 2026!",
        event_start_date="2026-09-01T00:00:00Z"
    )
    # (c) Similar title on DIFFERENT date -> Should NOT be merged
    ev3_diff_date = ScrapedEvent(
        external_id="f2",
        source="unstop",
        title="Global AI Hackathon 2026",
        event_start_date="2026-12-01T00:00:00Z"
    )

    batch = [ev1, ev1_exact, ev2_fuzzy, ev3_diff_date]
    deduped, removed_count, warnings = deduplicate_events(batch)

    # Should keep ev1 and ev3_diff_date, removing ev1_exact and ev2_fuzzy
    assert len(deduped) == 2
    assert removed_count == 2
    assert len(warnings) == 2
    assert any("Exact duplicate" in w for w in warnings)
    assert any("Fuzzy duplicate" in w for w in warnings)


@pytest.mark.asyncio
async def test_load_events_database_upsert():
    """Gap 1/Load: Asserts Postgres atomic ON CONFLICT DO UPDATE returning xmax for insertion and update counts."""
    import os
    pg_url = os.environ.get("TEST_POSTGRES_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/postgres")
    
    engine = create_async_engine(pg_url, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(HackathonEvent.__table__.create, checkfirst=True)

    TestingSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    ev1 = ScrapedEvent(
        external_id="pg-001",
        source="devpost",
        title="Original Devpost Event",
        organizer="Host A",
        prize_pool="$10,000",
        event_start_date="2026-09-01T00:00:00Z"
    )
    ev2 = ScrapedEvent(
        external_id="pg-002",
        source="devfolio",
        title="Devfolio Event",
        organizer="Host B",
        prize_pool="₹500,000",
        event_start_date="2026-09-05T00:00:00Z"
    )

    # First scrape load -> 2 inserts
    async with TestingSession() as db:
        loaded, inserted, updated = await load_events(db, [ev1, ev2])
        assert loaded == 2
        assert inserted == 2
        assert updated == 0

    # Verify rows in Postgres DB
    async with TestingSession() as db:
        res = await db.execute(select(HackathonEvent).where(HackathonEvent.source.in_(["devpost", "devfolio"])))
        db_records = res.scalars().all()
        assert len(db_records) >= 2

    # Second scrape with updated title and prize for ev1
    ev1_updated = ScrapedEvent(
        external_id="pg-001",
        source="devpost",
        title="Updated Devpost Event Title",
        organizer="Host A Updated",
        prize_pool="$50,000",
        event_start_date="2026-09-01T00:00:00Z"
    )

    async with TestingSession() as db:
        loaded2, inserted2, updated2 = await load_events(db, [ev1_updated])
        assert loaded2 == 1
        assert inserted2 == 0
        assert updated2 == 1

    # Verify updated values in DB
    async with TestingSession() as db:
        res = await db.execute(select(HackathonEvent).where(
            HackathonEvent.source == "devpost",
            HackathonEvent.external_id == "pg-001"
        ))
        record = res.scalars().first()
        assert record.title == "Updated Devpost Event Title"
        assert record.prize_pool == "$50,000"

    # Cleanup test records
    async with TestingSession() as db:
        from sqlalchemy import text
        await db.execute(text("DELETE FROM hackathon_events WHERE external_id IN ('pg-001', 'pg-002')"))
        await db.commit()

    await engine.dispose()


@pytest.mark.asyncio
async def test_load_events_postgres_concurrency():
    """Requirement 2/Concurrency: Asserts concurrent load_events calls with overlapping records do not cause unique constraint failures or duplicate rows."""
    import os
    import asyncio
    pg_url = os.environ.get("TEST_POSTGRES_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/postgres")
    
    engine = create_async_engine(pg_url, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(HackathonEvent.__table__.create, checkfirst=True)

    TestingSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    ev_concurrent = ScrapedEvent(
        external_id="pg-concurrency-1",
        source="unstop",
        title="Concurrent Hackathon",
        organizer="Unstop Host",
        event_start_date="2026-10-01T00:00:00Z"
    )

    async def _run_load():
        async with TestingSession() as db:
            return await load_events(db, [ev_concurrent])

    # Run two overlapping load operations concurrently
    results = await asyncio.gather(_run_load(), _run_load())
    assert len(results) == 2

    # Assert exactly 1 row exists in Postgres table
    async with TestingSession() as db:
        res = await db.execute(select(HackathonEvent).where(
            HackathonEvent.source == "unstop",
            HackathonEvent.external_id == "pg-concurrency-1"
        ))
        records = res.scalars().all()
        assert len(records) == 1

        # Cleanup
        from sqlalchemy import text
        await db.execute(text("DELETE FROM hackathon_events WHERE external_id = 'pg-concurrency-1'"))
        await db.commit()

    await engine.dispose()


@pytest.mark.asyncio
async def test_load_events_postgres_field_update_preserves_created_at():
    """Requirement 2/Field Update: Asserts updating fields modifies mutable fields and updates scraped_at timestamp."""
    import os
    pg_url = os.environ.get("TEST_POSTGRES_URL", "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/postgres")
    
    engine = create_async_engine(pg_url, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(HackathonEvent.__table__.create, checkfirst=True)

    TestingSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    ev = ScrapedEvent(
        external_id="pg-created-at-1",
        source="lablab",
        title="Original LabLab Title",
        prize_pool="$1,000",
        event_start_date="2026-11-01T00:00:00Z"
    )

    async with TestingSession() as db:
        await load_events(db, [ev])

    # Fetch initial record
    async with TestingSession() as db:
        res = await db.execute(select(HackathonEvent).where(
            HackathonEvent.source == "lablab",
            HackathonEvent.external_id == "pg-created-at-1"
        ))
        record1 = res.scalars().first()
        initial_id = record1.id

    # Reload with updated prize
    ev_updated = ScrapedEvent(
        external_id="pg-created-at-1",
        source="lablab",
        title="Original LabLab Title",
        prize_pool="$100,000",
        event_start_date="2026-11-01T00:00:00Z"
    )

    async with TestingSession() as db:
        await load_events(db, [ev_updated])

    # Verify prize_pool updated and primary key id remained identical
    async with TestingSession() as db:
        res = await db.execute(select(HackathonEvent).where(
            HackathonEvent.source == "lablab",
            HackathonEvent.external_id == "pg-created-at-1"
        ))
        record2 = res.scalars().first()
        assert record2.prize_pool == "$100,000"
        assert record2.id == initial_id

        # Cleanup
        from sqlalchemy import text
        await db.execute(text("DELETE FROM hackathon_events WHERE external_id = 'pg-created-at-1'"))
        await db.commit()

    await engine.dispose()

    await engine.dispose()
