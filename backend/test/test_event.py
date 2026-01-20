"""
Tests for event router (/protected/event).

Tests:
- POST /protected/event/createEvent
- POST /protected/event/removeEvent
- POST /protected/event/addEventUserRelationship
- POST /protected/event/removeEventUserRelationship
- POST /protected/event/getUsers
- POST /protected/event/getEvent
- GET /protected/event/getEventsFromUser
"""

import pytest
from fastapi.testclient import TestClient
from test_utils import create_test_event_payload, assert_event_response, assert_error_response


# ============================================================================
# Create Event Tests
# ============================================================================

@pytest.mark.event
@pytest.mark.integration
class TestCreateEvent:
    """Tests for POST /protected/event/createEvent endpoint."""
    
    def test_create_event_success(self, client: TestClient, test_user, auth_headers):
        """Test successful event creation with all fields."""
        payload = create_test_event_payload(
            event_name="Team Meeting",
            location="Conference Room A"
        )
        
        response = client.post(
            "/protected/event/createEvent",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert_event_response(data, expected_name="Team Meeting")
        assert data["user_id"] == test_user.id
        assert data["location"] == "Conference Room A"
    
    def test_create_event_minimal_fields(self, client: TestClient, auth_headers):
        """Test creating event with minimal required fields."""
        payload = {
            "event_name": "Minimal Event"
        }
        
        response = client.post(
            "/protected/event/createEvent",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["event_name"] == "Minimal Event"
    
    def test_create_event_duplicate_name(
        self,
        client: TestClient,
        test_event,
        auth_headers
    ):
        """Test creating event with duplicate name."""
        payload = {
            "event_name": test_event.event_name
        }
        
        response = client.post(
            "/protected/event/createEvent",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 400
        data = response.json()
        assert_error_response(data, expected_detail="event name exist")
    
    def test_create_event_no_authentication(self, client: TestClient):
        """Test creating event without authentication."""
        payload = create_test_event_payload()
        
        response = client.post("/protected/event/createEvent", json=payload)
        
        assert response.status_code == 401
        data = response.json()
        assert_error_response(data)
    
    def test_create_event_auto_adds_creator_relationship(
        self,
        client: TestClient,
        test_user,
        auth_headers,
        test_db
    ):
        """Verify that creating event auto-adds EventUser relationship."""
        from app.db.models.event_user import EventUser
        
        payload = create_test_event_payload(event_name="Auto Relationship Test")
        
        response = client.post(
            "/protected/event/createEvent",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        event_id = response.json()["id"]
        
        # Check EventUser relationship exists
        relationship = test_db.query(EventUser).filter_by(
            user_id=test_user.id,
            event_id=event_id
        ).first()
        
        assert relationship is not None
    
    def test_create_event_sets_user_id_from_token(
        self,
        client: TestClient,
        test_user,
        auth_headers
    ):
        """Verify user_id is set from token, not payload."""
        payload = create_test_event_payload(event_name="User ID Test")
        payload["user_id"] = 99999  # Try to set different user_id
        
        response = client.post(
            "/protected/event/createEvent",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # Should be test_user.id, not 99999
        assert data["user_id"] == test_user.id


# ============================================================================
# Remove Event Tests
# ============================================================================

@pytest.mark.event
@pytest.mark.integration
class TestRemoveEvent:
    """Tests for POST /protected/event/removeEvent endpoint."""
    
    def test_remove_event_success(
        self,
        client: TestClient,
        test_user,
        test_event,
        auth_headers
    ):
        """Test owner successfully removes their event."""
        payload = {
            "event_id": test_event.id
        }
        
        response = client.post(
            "/protected/event/removeEvent",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert "removed" in response.text.lower()
    
    def test_remove_event_not_owner(
        self,
        client: TestClient,
        test_event,
        second_auth_headers
    ):
        """Test non-owner cannot remove event."""
        payload = {
            "event_id": test_event.id
        }
        
        response = client.post(
            "/protected/event/removeEvent",
            json=payload,
            headers=second_auth_headers
        )
        
        assert response.status_code == 403
        data = response.json()
        assert_error_response(data, expected_detail="owner")
    
    def test_remove_nonexistent_event(self, client: TestClient, auth_headers):
        """Test removing event that doesn't exist."""
        payload = {
            "event_id": 99999
        }
        
        response = client.post(
            "/protected/event/removeEvent",
            json=payload,
            headers=auth_headers
        )
        
        # Should succeed (idempotent delete)
        assert response.status_code == 200
    
    def test_remove_event_no_authentication(self, client: TestClient, test_event):
        """Test removing event without authentication."""
        payload = {
            "event_id": test_event.id
        }
        
        response = client.post("/protected/event/removeEvent", json=payload)
        
        assert response.status_code == 401
        data = response.json()
        assert_error_response(data)


# ============================================================================
# Add Event User Relationship Tests
# ============================================================================

@pytest.mark.event
@pytest.mark.integration
class TestAddEventUserRelationship:
    """Tests for POST /protected/event/addEventUserRelationship endpoint."""
    
    def test_add_relationship_success(
        self,
        client: TestClient,
        test_user,
        test_event_with_relationship,
        second_test_user,
        auth_headers
    ):
        """Test successfully adding user to event."""
        payload = {
            "user_id": second_test_user.id,
            "event_id": test_event_with_relationship.id
        }
        
        response = client.post(
            "/protected/event/addEventUserRelationship",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
    
    def test_add_relationship_no_permission(
        self,
        client: TestClient,
        test_event,
        second_test_user,
        second_auth_headers,
        test_db
    ):
        """Test adding user to event without being owner."""
        # Create a different user's event
        from app.db.models.event import Event
        from datetime import datetime, timedelta, timezone
        
        other_event = Event(
            event_name="Other Event",
            user_id=2,  # Different owner
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(hours=1),
            location="Test"
        )
        test_db.add(other_event)
        test_db.commit()
        test_db.refresh(other_event)
        
        payload = {
            "user_id": second_test_user.id,
            "event_id": other_event.id
        }
        
        response = client.post(
            "/protected/event/addEventUserRelationship",
            json=payload,
            headers=second_auth_headers
        )
        
        assert response.status_code == 401
        data = response.json()
        assert_error_response(data, expected_detail="permission")
    
    def test_add_relationship_duplicate(
        self,
        client: TestClient,
        test_event_with_relationship,
        test_user,
        auth_headers
    ):
        """Test adding user that's already in the event."""
        payload = {
            "user_id": test_user.id,  # Already in event
            "event_id": test_event_with_relationship.id
        }
        
        response = client.post(
            "/protected/event/addEventUserRelationship",
            json=payload,
            headers=auth_headers
        )
        
        # Should fail with unique constraint violation
        assert response.status_code == 400
        assert_error_response(response.json(), expected_detail="Event User Relationship already exist.")
    
    def test_add_relationship_nonexistent_event(
        self,
        client: TestClient,
        test_user,
        auth_headers
    ):
        """Test adding relationship for nonexistent event."""
        payload = {
            "user_id": test_user.id,
            "event_id": 99999
        }
        
        response = client.post(
            "/protected/event/addEventUserRelationship",
            json=payload,
            headers=auth_headers
        )
        
        # Permission check should fail first (no permission for nonexistent event)
        assert response.status_code == 401


# ============================================================================
# Remove Event User Relationship Tests
# ============================================================================

@pytest.mark.event
@pytest.mark.integration
class TestRemoveEventUserRelationship:
    """Tests for POST /protected/event/removeEventUserRelationship endpoint."""
    
    def test_remove_relationship_success(
        self,
        client: TestClient,
        test_event_with_relationship,
        test_user,
        auth_headers,
        test_db
    ):
        """Test successfully removing user from event."""
        payload = {
            "user_id": test_user.id,
            "event_id": test_event_with_relationship.id
        }
        
        response = client.post(
            "/protected/event/removeEventUserRelationship",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
    
    def test_remove_relationship_no_permission(
        self,
        client: TestClient,
        test_event_with_relationship,
        second_test_user,
        second_auth_headers
    ):
        """Test removing relationship without permission."""
        payload = {
            "user_id": second_test_user.id,
            "event_id": test_event_with_relationship.id
        }
        
        response = client.post(
            "/protected/event/removeEventUserRelationship",
            json=payload,
            headers=second_auth_headers
        )
        
        assert response.status_code == 401
        data = response.json()
        assert_error_response(data, expected_detail="permission")


# ============================================================================
# Get Users Tests
# ============================================================================

@pytest.mark.event
@pytest.mark.integration
class TestGetUsers:
    """Tests for POST /protected/event/getUsers endpoint."""
    
    def test_get_users_success(
        self,
        client: TestClient,
        test_event_with_relationship,
        test_user,
        auth_headers
    ):
        """Test getting all users for an event."""
        payload = {
            "id": test_event_with_relationship.id
        }
        
        response = client.post(
            "/protected/event/getUsers",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        # Should include test_user
        user_ids = [user["id"] for user in data]
        assert test_user.id in user_ids
    
    def test_get_users_empty_event(
        self,
        client: TestClient,
        test_event,  # Event without relationships
        test_user,
        auth_headers,
        test_db
    ):
        """Test getting users for event with no users."""
        # Manually create EventUser for permission check
        from app.db.models.event_user import EventUser
        rel = EventUser(user_id=test_user.id, event_id=test_event.id)
        test_db.add(rel)
        test_db.commit()
        
        payload = {
            "id": test_event.id
        }
        
        response = client.post(
            "/protected/event/getUsers",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_users_no_permission(
        self,
        client: TestClient,
        test_event_with_relationship,
        second_auth_headers
    ):
        """Test getting users without permission."""
        payload = {
            "id": test_event_with_relationship.id
        }
        
        response = client.post(
            "/protected/event/getUsers",
            json=payload,
            headers=second_auth_headers
        )
        
        assert response.status_code == 401
        data = response.json()
        assert_error_response(data, expected_detail="permission")


# ============================================================================
# Get Events Tests
# ============================================================================

@pytest.mark.event
@pytest.mark.integration
class TestGetEvents:
    """Tests for GET/POST event retrieval endpoints."""
    
    def test_get_event_post(
        self,
        client: TestClient,
        test_event_with_relationship,
        auth_headers
    ):
        """Test POST /protected/event/getEvent."""
        response = client.post(
            "/protected/event/getEvent",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_events_from_user(
        self,
        client: TestClient,
        test_event_with_relationship,
        auth_headers
    ):
        """Test GET /protected/event/getEventsFromUser."""
        response = client.get(
            "/protected/event/getEventsFromUser",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            event_names = [event["event_name"] for event in data]
            assert test_event_with_relationship.event_name in event_names
    
    def test_get_events_empty_list(
        self,
        client: TestClient,
        second_auth_headers
    ):
        """Test getting events for user with no events."""
        response = client.get(
            "/protected/event/getEventsFromUser",
            headers=second_auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
