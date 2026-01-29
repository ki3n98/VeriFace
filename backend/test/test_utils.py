"""
Utility functions and helpers for tests.
"""

from typing import Dict, Any
from pathlib import Path
from io import BytesIO
from PIL import Image


def create_test_user_payload(
    first_name: str = "Test",
    last_name: str = "User",
    email: str = "test@example.com",
    password: str = "testpass123",
    **kwargs
) -> Dict[str, Any]:
    """Create a user payload for signup/update tests."""
    payload = {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "password": password
    }
    payload.update(kwargs)
    return payload


def create_test_event_payload(
    event_name: str = "Test Event",
    location: str = "Test Location",
    **kwargs
) -> Dict[str, Any]:
    """Create an event payload for event creation tests."""
    from datetime import datetime, timedelta, timezone
    
    payload = {
        "event_name": event_name,
        "start_date": datetime.now(timezone.utc).isoformat(),
        "end_date": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        "location": location
    }
    payload.update(kwargs)
    return payload


def get_test_image_path(image_name: str = "kien.jpg") -> Path:
    """Get path to a test image."""
    return Path(__file__).parent / image_name


def create_invalid_image_bytes() -> BytesIO:
    """Create invalid image data for error testing."""
    invalid_data = b"This is not an image file"
    return BytesIO(invalid_data)


def create_dummy_image(width: int = 100, height: int = 100) -> BytesIO:
    """
    Create a dummy image for testing.
    Useful when you need an image but don't care about face detection.
    """
    img = Image.new('RGB', (width, height), color='red')
    img_bytes = BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    return img_bytes


def assert_user_response(response_data: Dict, expected_email: str = None):
    """
    Assert that a user response has the correct structure.
    """
    assert "id" in response_data
    assert "first_name" in response_data
    assert "last_name" in response_data
    assert "email" in response_data
    assert "password" not in response_data  # Password should never be in response
    
    if expected_email:
        assert response_data["email"] == expected_email


def assert_event_response(response_data: Dict, expected_name: str = None):
    """
    Assert that an event response has the correct structure.
    """
    assert "id" in response_data
    assert "event_name" in response_data
    assert "user_id" in response_data
    assert "start_date" in response_data
    assert "end_date" in response_data
    assert "location" in response_data
    
    if expected_name:
        assert response_data["event_name"] == expected_name


def assert_error_response(response_data: Dict, expected_detail: str = None):
    """
    Assert that an error response has the correct structure.
    """
    assert "detail" in response_data
    
    if expected_detail:
        assert expected_detail.lower() in response_data["detail"].lower()
