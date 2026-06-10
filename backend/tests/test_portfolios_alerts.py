import pytest
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.models.watchlist import Watchlist, Alert
from backend.app.core.database import get_db
from backend.app.api.deps import get_current_verified_user

client = TestClient(app)

# Test IDs
USER_ID = uuid.uuid4()
PORTFOLIO_ID = uuid.uuid4()
WATCHLIST_ID = uuid.uuid4()
ALERT_ID = uuid.uuid4()

@pytest.fixture
def mock_user():
    return User(id=USER_ID, email="testuser@marketmind.ai", is_verified=True, role="premium")

@pytest.fixture
def mock_db():
    db = AsyncMock()
    
    # Sync side effect to auto-generate UUIDs and timestamps during db.add calls
    def add_side_effect(obj):
        if hasattr(obj, "id") and getattr(obj, "id") is None:
            obj.id = uuid.uuid4()
        if hasattr(obj, "created_at") and getattr(obj, "created_at") is None:
            obj.created_at = datetime.now(timezone.utc)
        if hasattr(obj, "updated_at") and getattr(obj, "updated_at") is None:
            obj.updated_at = datetime.now(timezone.utc)
        return None

    db.add = MagicMock(side_effect=add_side_effect)
    return db

# Mock rate limiting middleware Redis client
@pytest.fixture(autouse=True)
def mock_redis():
    with patch("backend.app.core.redis.redis_client.is_rate_limited", return_value=False) as mock_rl, \
         patch("backend.app.core.redis.redis_client.initialize", new_callable=AsyncMock), \
         patch("backend.app.core.redis.redis_client.close", new_callable=AsyncMock):
        yield mock_rl

# Override FastAPI dependencies
@pytest.fixture(autouse=True)
def override_dependencies(mock_db, mock_user):
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_verified_user] = lambda: mock_user
    yield
    app.dependency_overrides.clear()

# 1. Portfolio Intelligence API Tests
@pytest.mark.asyncio
async def test_get_portfolio_auto_creation(mock_db):
    # Mock no existing portfolio found
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result
    
    response = client.get("/api/v1/portfolio/")
    
    assert response.status_code == 200
    assert response.json()["name"] == "Default Portfolio"
    assert response.json()["holdings"] == []
    assert mock_db.add.called
    assert mock_db.commit.called

@pytest.mark.asyncio
async def test_update_portfolio(mock_db):
    # Mock existing portfolio found
    existing_portfolio = Portfolio(
        id=PORTFOLIO_ID, 
        user_id=USER_ID, 
        name="My Holdings", 
        holdings=[],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_portfolio
    mock_db.execute.return_value = mock_result
    
    payload = {
        "name": "Updated Holdings",
        "holdings": [
            {"symbol": "RELIANCE", "shares": 10, "avg_price": 2400.0},
            {"symbol": "TCS", "shares": 5, "avg_price": 3500.0}
        ]
    }
    
    response = client.post("/api/v1/portfolio/update", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Holdings"
    assert len(data["holdings"]) == 2
    assert data["holdings"][0]["symbol"] == "RELIANCE"
    assert mock_db.commit.called

@patch("backend.app.api.portfolio.data_provider.get_live_quote")
@pytest.mark.asyncio
async def test_analyze_portfolio(mock_get_quote, mock_db):
    # Mock portfolio with RELIANCE and TCS holdings
    holdings = [
        {"symbol": "RELIANCE", "shares": 10, "avg_price": 2400.0}, 
        {"symbol": "TCS", "shares": 5, "avg_price": 3200.0}       
    ]
    user_portfolio = Portfolio(
        id=PORTFOLIO_ID, 
        user_id=USER_ID, 
        name="My Holdings", 
        holdings=holdings,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = user_portfolio
    mock_db.execute.return_value = mock_result
    
    mock_get_quote.side_effect = [
        {"price": 2500.0, "change": 100.0, "change_percent": 4.17},
        {"price": 3000.0, "change": -200.0, "change_percent": -6.25}
    ]
    
    response = client.get("/api/v1/portfolio/analysis")
    
    assert response.status_code == 200
    data = response.json()
    assert data["total_value"] == 40000.0
    assert len(data["holdings"]) == 2
    
    # Check allocations
    assert data["diversification"][0]["symbol"] == "RELIANCE"
    assert data["diversification"][0]["allocation_percent"] == 62.5
    
    # Check sector concentration
    assert data["sector_concentration"][0]["sector"] == "Energy & Oil"
    assert data["sector_concentration"][0]["allocation_percent"] == 62.5
    
    # Verify recommendations
    assert any("Energy & Oil" in s for s in data["suggestions"])
    assert any("uncorrelated stocks" in s for s in data["suggestions"])

# 2. Watchlists & Alerts API Tests
@pytest.mark.asyncio
async def test_create_watchlist(mock_db):
    response = client.post(
        "/api/v1/watchlists/create",
        json={"name": "Tech Stocks", "symbols": ["infy", "wipro"]}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Tech Stocks"
    assert data["symbols"] == ["INFY", "WIPRO"]
    assert mock_db.commit.called

@pytest.mark.asyncio
async def test_create_alert(mock_db):
    payload = {
        "symbol": "reliance",
        "alert_type": "price",
        "condition": "above",
        "target_value": 2600.0
    }
    response = client.post("/api/v1/watchlists/alerts/create", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["symbol"] == "RELIANCE"
    assert data["target_value"] == 2600.0
    assert data["is_active"] is True
    assert mock_db.commit.called

@pytest.mark.asyncio
async def test_get_alerts(mock_db):
    mock_alerts = [
        Alert(
            id=ALERT_ID, 
            user_id=USER_ID, 
            symbol="RELIANCE", 
            alert_type="price", 
            condition="above", 
            target_value=2600.0, 
            is_active=True,
            created_at=datetime.now(timezone.utc)
        )
    ]
    mock_result = MagicMock()
    mock_result.scalars().all.return_value = mock_alerts
    mock_db.execute.return_value = mock_result
    
    response = client.get("/api/v1/watchlists/alerts")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["symbol"] == "RELIANCE"
    assert data[0]["target_value"] == 2600.0
