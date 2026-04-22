import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test_secret_key_for_testing_only")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")
os.environ.setdefault("CHESS_MODEL_PATH", "")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.app import app
from src.db.database import get_db
from src.db.models import Base

# This is a config file for testing, contains fixtures for resetting db for every test, providing a pre-authenticated client, and a mock ai engine for move creation.

# Boilerplate for db set up
TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(autouse=True)
def setup_tables():
    Base.metadata.create_all(TEST_ENGINE)
    yield
    Base.metadata.drop_all(TEST_ENGINE)


@pytest.fixture
def db(setup_tables):
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# Pre Authenticated client fixture for tests, it signs up new user and add JWT token to client headers for request that needs authentication
@pytest.fixture
def auth_client(client):
    resp = client.post(
        "/auth/signup",
        json={"username": "testuser", "password": "testpass123"},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


# Mock AI Engine that returns a fixed move of e7e5 every time.
@pytest.fixture(autouse=True)
def mock_ai_engine(mocker):
    mocker.patch(
        "src.features.game.game_controller.get_ai_move",
        return_value="e7e5",
    )
    mocker.patch(
        "src.features.game.game_controller.get_ai_move_elo",
        return_value="e7e5",
    )
