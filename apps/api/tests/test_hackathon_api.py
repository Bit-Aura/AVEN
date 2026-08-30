import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

from app.main import app
from app.core.db import get_db, async_session
from app.models.domain import HackathonEvent, User, LearnerProfile
from app.scraper.models_events import ScrapedEvent
from app.scraper.event_pipeline import load_events
from tests.conftest import make_test_auth_headers

client = TestClient(app)

# Helper headers
LEARNER_HEADERS = make_test_auth_headers("test_learner@pathfinder.dev", "LEARNER")
ADMIN_HEADERS = make_test_auth_headers("admin@aven.com", "ADMIN")

# Helper timestamps
NOW = datetime.now(timezone.utc)
FUTURE_ISO_1 = (NOW + timedelta(days=10)).isoformat()
FUTURE_ISO_2 = (NOW + timedelta(days=30)).isoformat()
PAST_ISO = (NOW - timedelta(days=30)).isoformat()


@pytest.fixture(autouse=True)
def setup_hackathon_test_data():
    """
    Seeds mock hackathon events into database before running API tests.
    """
    async def _seed():
        async with async_session() as session:
            # Clean up existing test records
            await session.execute(text("DELETE FROM hackathon_events"))
            
            # Ensure test users exist
            from sqlalchemy import select
            l_user = (await session.execute(select(User).where(User.email == "test_learner@pathfinder.dev"))).scalars().first()
            if not l_user:
                l_user = User(clerk_id="clerk_test_learner_hackathon", email="test_learner@pathfinder.dev", name="Hackathon Learner", role="LEARNER", is_active=True)
                session.add(l_user)
                await session.flush()
                session.add(LearnerProfile(user_id=l_user.id))
            else:
                l_user.role = "LEARNER"
                l_user.is_active = True

            a_user = (await session.execute(select(User).where(User.email == "admin@aven.com"))).scalars().first()
            if not a_user:
                a_user = User(clerk_id="clerk_test_admin_hackathon", email="admin@aven.com", name="Hackathon Admin", role="ADMIN", is_active=True)
                session.add(a_user)
                await session.flush()
                session.add(LearnerProfile(user_id=a_user.id))
            else:
                a_user.role = "ADMIN"
                a_user.is_active = True

            await session.commit()

            ev1 = ScrapedEvent(
                external_id="api-001",
                source="api_devpost",
                title="Global Python AI Buildathon",
                organizer="OpenAI",
                description="Build AI applications using Python and PyTorch.",
                location="Online",
                mode="online",
                city=None,
                prize_pool="$50,000",
                registration_deadline=FUTURE_ISO_2,
                event_start_date=FUTURE_ISO_1,
                event_end_date=(NOW + timedelta(days=12)).isoformat(),
                skills=["Python", "AI", "PyTorch"]
            )

            ev2 = ScrapedEvent(
                external_id="api-002",
                source="api_devfolio",
                title="MIT Onsite Robotics Challenge",
                organizer="MIT Robotics Lab",
                description="Hardware and software challenge in Cambridge.",
                location="Cambridge, MA",
                mode="onsite",
                city="Cambridge",
                state="MA",
                country="USA",
                prize_pool="$25,000",
                registration_deadline=FUTURE_ISO_1,
                event_start_date=FUTURE_ISO_2,
                event_end_date=(NOW + timedelta(days=35)).isoformat(),
                skills=["Robotics", "C++"]
            )

            ev3 = ScrapedEvent(
                external_id="api-003",
                source="api_unstop",
                title="Closed Historical Hackathon",
                organizer="Legacy Partner",
                description="Historical event that has already ended.",
                location="Online",
                mode="online",
                registration_deadline=PAST_ISO,
                event_start_date=PAST_ISO,
                event_end_date=PAST_ISO,
                skills=["Legacy"]
            )

            await load_events(session, [ev1, ev2, ev3])

    import asyncio
    asyncio.run(_seed())


# ---------------------------------------------------------------------------
# 1. Unfiltered List
# ---------------------------------------------------------------------------

def test_list_hackathons_unfiltered():
    """GET /api/v1/hackathons with no parameters returns page 1 with standard pagination envelope."""
    response = client.get("/api/v1/hackathons", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "events" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data
    assert "has_next" in data
    assert data["total"] >= 3
    assert data["page"] == 1
    assert data["page_size"] == 20


# ---------------------------------------------------------------------------
# 2. Individual Filter Tests
# ---------------------------------------------------------------------------

def test_list_hackathons_filter_source():
    """GET /api/v1/hackathons?source=api_devpost filters by specific source platform."""
    response = client.get("/api/v1/hackathons?source=api_devpost", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert all(e["source"] == "api_devpost" for e in data["events"])


def test_list_hackathons_filter_mode():
    """GET /api/v1/hackathons?mode=onsite filters by event mode."""
    response = client.get("/api/v1/hackathons?mode=onsite", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert all(e["mode"] == "onsite" for e in data["events"])


def test_list_hackathons_filter_city():
    """GET /api/v1/hackathons?city=Cambridge filters by city name."""
    response = client.get("/api/v1/hackathons?city=Cambridge", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any("Cambridge" in (e.get("city") or e.get("location") or "") for e in data["events"])


def test_list_hackathons_filter_status_upcoming():
    """GET /api/v1/hackathons?status=upcoming filters for upcoming status events."""
    response = client.get("/api/v1/hackathons?status=upcoming", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert all(e["status"] == "upcoming" for e in data["events"])


def test_list_hackathons_filter_status_closed():
    """GET /api/v1/hackathons?status=closed filters for closed status events."""
    response = client.get("/api/v1/hackathons?status=closed", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert all(e["status"] == "closed" for e in data["events"])


def test_list_hackathons_filter_status_open():
    """GET /api/v1/hackathons?status=open filters for open status events."""
    response = client.get("/api/v1/hackathons?status=open", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "events" in data


def test_list_hackathons_filter_min_prize():
    """GET /api/v1/hackathons?min_prize=10000 filters events with prize pools."""
    response = client.get("/api/v1/hackathons?min_prize=10000", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    assert all(e["prize_pool"] is not None for e in data["events"])


def test_list_hackathons_sort_deadline_asc():
    """GET /api/v1/hackathons?sort=deadline_asc sorts events by deadline ascending."""
    response = client.get("/api/v1/hackathons?sort=deadline_asc", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert len(data["events"]) >= 2


def test_list_hackathons_sort_prize_desc():
    """GET /api/v1/hackathons?sort=prize_desc sorts events by prize descending."""
    response = client.get("/api/v1/hackathons?sort=prize_desc", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert len(data["events"]) >= 2


def test_list_hackathons_sort_start_asc():
    """GET /api/v1/hackathons?sort=start_asc sorts events by start date ascending."""
    response = client.get("/api/v1/hackathons?sort=start_asc", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert len(data["events"]) >= 2


def test_list_hackathons_sort_newest():
    """GET /api/v1/hackathons?sort=newest sorts events by scraped timestamp descending."""
    response = client.get("/api/v1/hackathons?sort=newest", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert len(data["events"]) >= 2


# ---------------------------------------------------------------------------
# 3. Pagination Boundary Tests
# ---------------------------------------------------------------------------

def test_pagination_first_page():
    """GET /api/v1/hackathons?page=1&page_size=1 verifies first page bounds and has_next=True."""
    response = client.get("/api/v1/hackathons?page=1&page_size=1", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert len(data["events"]) == 1
    assert data["page"] == 1
    assert data["page_size"] == 1
    assert data["has_next"] is True


def test_pagination_last_page():
    """GET /api/v1/hackathons?page=3&page_size=1 verifies last page bounds and has_next=False."""
    response = client.get("/api/v1/hackathons?page=3&page_size=1", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert len(data["events"]) == 1
    assert data["page"] == 3
    assert data["has_next"] is False


def test_pagination_empty_page():
    """GET /api/v1/hackathons?page=99&page_size=10 returns empty events list and has_next=False."""
    response = client.get("/api/v1/hackathons?page=99&page_size=10", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["events"] == []
    assert data["page"] == 99
    assert data["has_next"] is False


# ---------------------------------------------------------------------------
# 4. Search Hit and Miss Tests
# ---------------------------------------------------------------------------

def test_search_hackathons_hit():
    """GET /api/v1/hackathons/search?q=Python returns matching events."""
    response = client.get("/api/v1/hackathons/search?q=Python", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any("Python" in e["title"] or "Python" in (e.get("description") or "") for e in data["events"])


def test_search_hackathons_miss():
    """GET /api/v1/hackathons/search?q=NonExistentQuery999 returns empty list."""
    response = client.get("/api/v1/hackathons/search?q=NonExistentQuery999", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["events"] == []


# ---------------------------------------------------------------------------
# 5. Upcoming Events Ordering Test
# ---------------------------------------------------------------------------

def test_upcoming_hackathons_ordering():
    """GET /api/v1/hackathons/upcoming returns future events ordered soonest-first."""
    response = client.get("/api/v1/hackathons/upcoming", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    starts = [e["event_start_date"] for e in data["events"] if e.get("event_start_date")]
    assert starts == sorted(starts)


# ---------------------------------------------------------------------------
# 6. Sources Endpoint Test
# ---------------------------------------------------------------------------

def test_get_hackathon_sources():
    """GET /api/v1/hackathons/sources returns registry of 10 scraper sources."""
    response = client.get("/api/v1/hackathons/sources", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "sources" in data
    assert len(data["sources"]) == 10


# ---------------------------------------------------------------------------
# 7. Single Event Detail Tests
# ---------------------------------------------------------------------------

def test_get_hackathon_detail_200():
    """GET /api/v1/hackathons/{id} returns single event record on hit."""
    response = client.get("/api/v1/hackathons/api-001", headers=LEARNER_HEADERS)
    assert response.status_code == 200
    detail = response.json()
    assert detail["external_id"] == "api-001"
    assert detail["source"] == "api_devpost"
    assert detail["title"] == "Global Python AI Buildathon"


def test_get_hackathon_detail_404():
    """GET /api/v1/hackathons/999999 returns 404 Not Found."""
    response = client.get("/api/v1/hackathons/999999", headers=LEARNER_HEADERS)
    assert response.status_code == 404
    assert response.json()["detail"] == "Hackathon event with ID '999999' not found."


# ---------------------------------------------------------------------------
# 8. RBAC Auth Tests
# ---------------------------------------------------------------------------

def test_read_endpoint_unauthenticated_returns_401():
    """Requesting read route with malformed Bearer token returns 401 Unauthorized."""
    response = client.get("/api/v1/hackathons", headers={"Authorization": "Bearer invalid.token.payload"})
    assert response.status_code == 401
    assert "Invalid, expired, or corrupted" in response.json()["detail"]


def test_scrape_endpoint_non_admin_returns_403():
    """Triggering POST /scrape as a non-admin Learner returns 403 Forbidden."""
    payload = {"source": "devpost"}
    response = client.post("/api/v1/hackathons/scrape", json=payload, headers=LEARNER_HEADERS)
    assert response.status_code == 403
    assert "Admin access required" in response.json()["detail"]


def test_scrape_endpoint_admin_returns_200():
    """Triggering POST /scrape as an Admin user executes successfully."""
    payload = {"source": "devpost", "limit": 1}
    response = client.post("/api/v1/hackathons/scrape", json=payload, headers=ADMIN_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "source" in data
    assert data["source"] == "devpost"
