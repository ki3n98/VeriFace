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
        response = client.post(
            "/protected/event/removeEvent",
            json={"event_id": test_event.id},
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
        response = client.post(
            "/protected/event/removeEvent",
            json={"event_id": test_event.id},
            headers=second_auth_headers
        )

        assert response.status_code == 401
        data = response.json()
        assert_error_response(data, expected_detail="permission")

    def test_remove_nonexistent_event(self, client: TestClient, auth_headers):
        """Test removing event that doesn't exist."""
        response = client.post(
            "/protected/event/removeEvent",
            json={"event_id": 99999},
            headers=auth_headers
        )

        # Should fail permission check (no permission for nonexistent event)
        assert response.status_code == 401

    def test_remove_event_no_authentication(self, client: TestClient, test_event):
        """Test removing event without authentication."""
        response = client.post(
            "/protected/event/removeEvent",
            json={"event_id": test_event.id}
        )

        assert response.status_code == 401
        data = response.json()
        assert_error_response(data)

    def test_remove_event_cascade_deletes_related_data(
        self,
        client: TestClient,
        test_user,
        test_db,
        auth_headers
    ):
        """
        Test that removing an event cascades to delete:
        - All Attendance records for sessions in that event
        - All Session records for the event
        - All EventUser relationships for the event
        """
        from app.db.models.event import Event
        from app.db.models.event_user import EventUser
        from app.db.models.session import Session as SessionModel
        from app.db.models.attendance import Attendance, AttendanceStatus
        from datetime import datetime, timedelta, timezone

        # 1. Create an event
        event = Event(
            event_name="Cascade Test Event",
            user_id=test_user.id,
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(hours=2),
            location="Test Location"
        )
        test_db.add(event)
        test_db.commit()
        test_db.refresh(event)
        event_id = event.id

        # 2. Create EventUser relationship (owner)
        event_user = EventUser(user_id=test_user.id, event_id=event_id)
        test_db.add(event_user)
        test_db.commit()

        # 3. Create sessions for the event
        session1 = SessionModel(event_id=event_id, sequence_number=1)
        session2 = SessionModel(event_id=event_id, sequence_number=2)
        test_db.add(session1)
        test_db.add(session2)
        test_db.commit()
        test_db.refresh(session1)
        test_db.refresh(session2)
        session1_id = session1.id
        session2_id = session2.id

        # 4. Create attendance records for sessions
        att1 = Attendance(
            user_id=test_user.id,
            session_id=session1_id,
            status=AttendanceStatus.PRESENT
        )
        att2 = Attendance(
            user_id=test_user.id,
            session_id=session2_id,
            status=AttendanceStatus.ABSENT
        )
        test_db.add(att1)
        test_db.add(att2)
        test_db.commit()

        # Verify data exists before deletion
        assert test_db.query(Event).filter_by(id=event_id).first() is not None
        assert test_db.query(EventUser).filter_by(event_id=event_id).count() == 1
        assert test_db.query(SessionModel).filter_by(event_id=event_id).count() == 2
        assert test_db.query(Attendance).filter_by(session_id=session1_id).count() == 1
        assert test_db.query(Attendance).filter_by(session_id=session2_id).count() == 1

        # 5. Remove the event via API
        response = client.post(
            "/protected/event/removeEvent",
            json={"event_id": event_id},
            headers=auth_headers
        )

        assert response.status_code == 200

        # 6. Verify cascade delete - all related data should be gone
        # Need to expire cache to see DB changes
        test_db.expire_all()

        assert test_db.query(Event).filter_by(id=event_id).first() is None, \
            "Event should be deleted"
        assert test_db.query(EventUser).filter_by(event_id=event_id).count() == 0, \
            "EventUser relationships should be deleted"
        assert test_db.query(SessionModel).filter_by(event_id=event_id).count() == 0, \
            "Sessions should be deleted"
        assert test_db.query(Attendance).filter_by(session_id=session1_id).count() == 0, \
            "Attendance records for session1 should be deleted"
        assert test_db.query(Attendance).filter_by(session_id=session2_id).count() == 0, \
            "Attendance records for session2 should be deleted"


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
        second_test_user,
        auth_headers,
        test_db
    ):
        """Test getting users for an event. Creator (admin) is excluded from attendance list."""
        from app.db.models.event_user import EventUser

        # Add second user to event so we have a non-creator to return
        relationship = EventUser(
            user_id=second_test_user.id,
            event_id=test_event_with_relationship.id
        )
        test_db.add(relationship)
        test_db.commit()

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
        user_ids = [user["id"] for user in data]
        # Should include second_test_user (member)
        assert second_test_user.id in user_ids
        # Creator (admin) should NOT be in attendance list
        assert test_user.id not in user_ids
    
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


# ============================================================================
# Remove Member Tests
# ============================================================================

@pytest.mark.event
@pytest.mark.integration
class TestRemoveMember:
    """Tests for POST /protected/event/{event_id}/removeMember endpoint."""

    def test_remove_member_success(
        self,
        client: TestClient,
        test_event_with_relationship,
        test_user,
        second_test_user,
        auth_headers,
        test_db
    ):
        """Test successfully removing a member from event."""
        from app.db.models.event_user import EventUser

        # Add second_test_user to the event
        relationship = EventUser(
            user_id=second_test_user.id,
            event_id=test_event_with_relationship.id
        )
        test_db.add(relationship)
        test_db.commit()

        response = client.post(
            f"/protected/event/{test_event_with_relationship.id}/removeMember",
            params={"member_id": second_test_user.id},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "removed" in str(data).lower() or data.get("success", False) or "success" in str(data).lower()

    def test_remove_member_no_permission(
        self,
        client: TestClient,
        test_event_with_relationship,
        test_user,
        second_test_user,
        second_auth_headers,
        test_db
    ):
        """Test removing member without event permission."""
        from app.db.models.event_user import EventUser

        # Add second_test_user to the event (but they're not the owner)
        relationship = EventUser(
            user_id=second_test_user.id,
            event_id=test_event_with_relationship.id
        )
        test_db.add(relationship)
        test_db.commit()

        response = client.post(
            f"/protected/event/{test_event_with_relationship.id}/removeMember",
            params={"member_id": test_user.id},
            headers=second_auth_headers
        )

        assert response.status_code == 403
        data = response.json()
        assert_error_response(data, expected_detail="permission")

    def test_remove_member_no_authentication(
        self,
        client: TestClient,
        test_event_with_relationship,
        test_user
    ):
        """Test removing member without authentication."""
        response = client.post(
            f"/protected/event/{test_event_with_relationship.id}/removeMember",
            params={"member_id": test_user.id}
        )

        assert response.status_code == 401
        data = response.json()
        assert_error_response(data)

    def test_remove_member_nonexistent_event(
        self,
        client: TestClient,
        test_user,
        auth_headers
    ):
        """Test removing member from nonexistent event."""
        response = client.post(
            "/protected/event/99999/removeMember",
            params={"member_id": test_user.id},
            headers=auth_headers
        )

        # Should fail permission check (no permission for nonexistent event)
        assert response.status_code == 403

    def test_remove_member_not_in_event(
        self,
        client: TestClient,
        test_event_with_relationship,
        second_test_user,
        auth_headers
    ):
        """Test removing member who is not in the event."""
        response = client.post(
            f"/protected/event/{test_event_with_relationship.id}/removeMember",
            params={"member_id": second_test_user.id},
            headers=auth_headers
        )

        # Should handle gracefully (member not found or already removed)
        assert response.status_code in [200, 404]

    def test_remove_member_self(
        self,
        client: TestClient,
        test_event_with_relationship,
        test_user,
        auth_headers
    ):
        """Test owner removing themselves from event."""
        response = client.post(
            f"/protected/event/{test_event_with_relationship.id}/removeMember",
            params={"member_id": test_user.id},
            headers=auth_headers
        )

        # Should succeed - owner can remove themselves
        assert response.status_code == 200
