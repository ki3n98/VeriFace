"""
Pytest configuration and fixtures for VeriFace backend tests.

This file provides:
- Test database setup (SQLite in-memory)
- FastAPI TestClient
- Authentication fixtures (users, tokens)
- Test data factories
"""

import pytest
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.core.security.hashHelper import HashHelper
from app.core.security.authHandler import AuthHandler
from main import app


# ============================================================================
# Database Fixtures
# ============================================================================

@pytest.fixture(scope="function")
def test_db() -> Generator[Session, None, None]:
    """
    Use the real PostgreSQL (Supabase) database for tests.
    Creates a transaction and rolls it back after each test to ensure isolation.
    
    This keeps tests consistent with production environment (PostgreSQL features like ARRAY).
    All changes are rolled back, so no cleanup needed.
    """
    from app.core.database import engine
    
    # Create a connection
    connection = engine.connect()
    
    # Begin a transaction
    transaction = connection.begin()
    
    # Create a session bound to the connection
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = TestSessionLocal()
    
    try:
        yield session
    finally:
        session.close()
        # Rollback the transaction - this undoes all changes made during the test
        transaction.rollback()
        connection.close()


@pytest.fixture(scope="function")
def client(test_db: Session) -> TestClient:
    """
    FastAPI TestClient that uses the test database.
    Overrides the get_db dependency to use test_db.
    """
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


# ============================================================================
# User & Auth Fixtures
# ============================================================================

@pytest.fixture
def test_user_data():
    """Basic test user data without password hashing."""
    return {
        "first_name": "Test",
        "last_name": "User",
        "email": "test@example.com",
        "password": "testpassword123"
    }


@pytest.fixture
def test_user(test_db: Session, test_user_data):
    """
    Create a test user in the database.
    Returns user data with hashed password.
    """
    from app.db.models.user import User
    
    user = User(
        first_name=test_user_data["first_name"],
        last_name=test_user_data["last_name"],
        email=test_user_data["email"],
        password=HashHelper.get_password_hash(test_user_data["password"]),
        embedding=None
    )
    
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    return user


@pytest.fixture
def test_user_with_embedding(test_db: Session):
    """
    Create a test user with a face embedding.
    Uses a dummy 512-dimensional embedding vector.
    """
    from app.db.models.user import User
    
    # Create dummy embedding (FaceNet produces 512-dim vectors)
    dummy_embedding = [0.1] * 512
    
    user = User(
        first_name="John",
        last_name="Doe",
        email="john@example.com",
        password=HashHelper.get_password_hash("password123"),
        embedding=dummy_embedding
    )
    
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    return user


@pytest.fixture
def auth_token(test_user):
    """Generate a valid JWT token for the test user."""
    return AuthHandler.sign_jwt(user_id=test_user.id)


@pytest.fixture
def auth_headers(auth_token):
    """Generate authorization headers with Bearer token."""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture
def second_test_user(test_db: Session):
    """Create a second test user for multi-user scenarios."""
    from app.db.models.user import User
    
    user = User(
        first_name="Jane",
        last_name="Smith",
        email="jane@example.com",
        password=HashHelper.get_password_hash("password456"),
        embedding=None
    )
    
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    
    return user


@pytest.fixture
def second_auth_token(second_test_user):
    """Generate auth token for second test user."""
    return AuthHandler.sign_jwt(user_id=second_test_user.id)


@pytest.fixture
def second_auth_headers(second_auth_token):
    """Generate auth headers for second test user."""
    return {
        "Authorization": f"Bearer {second_auth_token}",
        "Content-Type": "application/json"
    }


# ============================================================================
# Event Fixtures
# ============================================================================

@pytest.fixture
def test_event(test_db: Session, test_user):
    """Create a test event owned by test_user."""
    from app.db.models.event import Event
    from datetime import datetime, timedelta, timezone
    
    event = Event(
        event_name="Test Event",
        user_id=test_user.id,
        start_date=datetime.now(timezone.utc),
        end_date=datetime.now(timezone.utc) + timedelta(hours=2),
        location="Test Location"
    )
    
    test_db.add(event)
    test_db.commit()
    test_db.refresh(event)
    
    return event


@pytest.fixture
def test_event_with_relationship(test_db: Session, test_user, test_event):
    """Create a test event with EventUser relationship."""
    from app.db.models.event_user import EventUser
    
    relationship = EventUser(
        user_id=test_user.id,
        event_id=test_event.id
    )
    
    test_db.add(relationship)
    test_db.commit()
    test_db.refresh(relationship)
    
    return test_event


# ============================================================================
# Session & Attendance Fixtures
# ============================================================================

@pytest.fixture
def test_session(test_db: Session, test_event):
    """Create a test session for an event."""
    from app.db.models.session import Session as SessionModel
    
    session_obj = SessionModel(
        event_id=test_event.id
    )
    
    test_db.add(session_obj)
    test_db.commit()
    test_db.refresh(session_obj)
    
    return session_obj


@pytest.fixture
def test_attendance(test_db: Session, test_session, test_user_with_embedding):
    """Create a test attendance record."""
    from app.db.models.attendance import Attendance
    
    attendance = Attendance(
        session_id=test_session.id,
        user_id=test_user_with_embedding.id,
        status="ABSENT"
    )
    
    test_db.add(attendance)
    test_db.commit()
    test_db.refresh(attendance)
    
    return attendance


# ============================================================================
# Test Image Fixtures
# ============================================================================

@pytest.fixture
def test_image_path():
    """Path to a valid test image."""
    return Path(__file__).parent / "test" / "kien.jpg"


@pytest.fixture
def test_image_file(test_image_path):
    """Open test image file for upload tests."""
    return open(test_image_path, "rb")


@pytest.fixture
def multiple_test_images():
    """Dictionary of test images for different users."""
    test_dir = Path(__file__).parent / "test"
    return {
        "kien": test_dir / "kien.jpg",
        "jason": test_dir / "jason.jpg",
        "hector": test_dir / "hector.jpg",
        "syn": test_dir / "syn.jpg"
    }


# ============================================================================
# Utility Fixtures
# ============================================================================

@pytest.fixture
def faker_seed():
    """Seed for faker to ensure reproducible test data."""
    from faker import Faker
    fake = Faker()
    Faker.seed(12345)
    return fake


# ============================================================================
# Cleanup Hooks
# ============================================================================

@pytest.fixture(autouse=True)
def reset_db_state(test_db: Session):
    """
    Automatically reset database state after each test.
    Ensures test isolation.
    """
    yield
    # Rollback any uncommitted changes
    test_db.rollback()
