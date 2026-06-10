import pytest
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models.user import User, OTPVerification
from backend.app.core.database import get_db

client = TestClient(app)

@pytest.fixture
def mock_db():
    db = AsyncMock()
    
    # Synchronous db.add side effect to populate ID and timestamps
    # and prevent AsyncMock from warning about unawaited coroutines on sync methods.
    def add_side_effect(obj):
        if hasattr(obj, "id") and getattr(obj, "id") is None:
            obj.id = uuid.uuid4()
        if hasattr(obj, "created_at") and getattr(obj, "created_at") is None:
            obj.created_at = datetime.now(timezone.utc)
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

# Override database dependency injection in FastAPI app
@pytest.fixture(autouse=True)
def override_db(mock_db):
    app.dependency_overrides[get_db] = lambda: mock_db
    yield
    app.dependency_overrides.clear()

# Mock password hashing helper functions directly on the auth router imports
@pytest.fixture(autouse=True)
def mock_security():
    with patch("backend.app.api.auth.get_password_hash", side_effect=lambda p: f"mock_hash_{p}") as mock_hash, \
         patch("backend.app.api.auth.verify_password", side_effect=lambda p, h: h == f"mock_hash_{p}") as mock_verify:
        yield mock_hash, mock_verify

@pytest.mark.asyncio
async def test_signup_success(mock_db):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result
    
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "newuser@example.com", "password": "securepassword123"}
    )
    
    assert response.status_code == 201
    assert response.json()["email"] == "newuser@example.com"
    assert response.json()["is_verified"] is False
    assert mock_db.commit.called

@pytest.mark.asyncio
async def test_signup_existing_email(mock_db):
    mock_user = User(email="existing@example.com")
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db.execute.return_value = mock_result
    
    response = client.post(
        "/api/v1/auth/signup",
        json={"email": "existing@example.com", "password": "securepassword123"}
    )
    
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_success(mock_db):
    mock_user = User(id=uuid.uuid4(), email="user@example.com", password_hash="mock_hash_mypassword", role="free")
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db.execute.return_value = mock_result
    
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "user@example.com", "password": "mypassword"}
    )
    
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["role"] == "free"

@pytest.mark.asyncio
async def test_login_invalid_credentials(mock_db):
    mock_user = User(id=uuid.uuid4(), email="user@example.com", password_hash="mock_hash_mypassword", role="free")
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db.execute.return_value = mock_result
    
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "user@example.com", "password": "wrongpassword"}
    )
    
    assert response.status_code == 400
    assert "Incorrect email" in response.json()["detail"]

@pytest.mark.asyncio
async def test_verify_otp_success(mock_db):
    mock_user = User(id=uuid.uuid4(), email="user@example.com", is_verified=False)
    mock_otp = OTPVerification(
        user_id=mock_user.id,
        otp_code="123456",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
    )
    
    mock_result_user = MagicMock()
    mock_result_user.scalar_one_or_none.return_value = mock_user
    
    mock_result_otp = MagicMock()
    mock_result_otp.scalar_one_or_none.return_value = mock_otp
    
    mock_db.execute.side_effect = [mock_result_user, mock_result_otp]
    
    response = client.post(
        "/api/v1/auth/verify-otp",
        json={"email": "user@example.com", "code": "123456"}
    )
    
    assert response.status_code == 200
    assert "successfully verified" in response.json()["message"]
    assert mock_user.is_verified is True

@pytest.mark.asyncio
async def test_social_login(mock_db):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_result
    
    response = client.post(
        "/api/v1/auth/social-login?provider=google&token=mocktoken123"
    )
    
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["role"] == "premium"
    assert response.json()["email"] == "social_google_user@marketmind.ai"
