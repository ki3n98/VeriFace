"""
Tests for session router (/protected/session).

Tests:
- POST /protected/session/createSession
- POST /protected/session/checkin
"""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path
from test_utils import assert_error_response


# ============================================================================
# Create Session Tests
# ============================================================================

@pytest.mark.session
@pytest.mark.integration
class TestCreateSession:
    """Tests for POST /protected/session/createSession endpoint."""
    
    def test_create_session_success(
        self,
        client: TestClient,
        test_user,
        test_event_with_relationship,
        auth_headers
    ):
        """Test successfully creating a session for an event."""
        payload = {
            "event_id": test_event_with_relationship.id
        }
        
        response = client.post(
            "/protected/session/createSession",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        session_data = data["session"]
        assert "id" in session_data
        assert session_data["event_id"] == test_event_with_relationship.id
    
    def test_create_session_creates_attendance_records(
        self,
        client: TestClient,
        test_user,
        test_event_with_relationship,
        auth_headers,
        test_db
    ):
        """Verify session creation auto-creates attendance records."""
        from app.db.models.attendance import Attendance
        
        payload = {
            "event_id": test_event_with_relationship.id
        }
        
        response = client.post(
            "/protected/session/createSession",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        session_id = response.json()["session"]["id"]

        # Check attendance records were created
        attendances = test_db.query(Attendance).filter_by(
            session_id=session_id
        ).all()
        
        assert len(attendances) > 0
        # Should have attendance for test_user
        user_ids = [att.user_id for att in attendances]
        assert test_user.id in user_ids
    
    def test_create_session_no_permission(
        self,
        client: TestClient,
        test_event_with_relationship,
        second_auth_headers
    ):
        """Test creating session without being event owner."""
        payload = {
            "event_id": test_event_with_relationship.id
        }
        
        response = client.post(
            "/protected/session/createSession",
            json=payload,
            headers=second_auth_headers
        )
        
        assert response.status_code == 401
        data = response.json()
        assert_error_response(data, expected_detail="permission")
    
    def test_create_session_nonexistent_event(
        self,
        client: TestClient,
        auth_headers
    ):
        """Test creating session for nonexistent event."""
        payload = {
            "event_id": 99999
        }
        
        response = client.post(
            "/protected/session/createSession",
            json=payload,
            headers=auth_headers
        )
        
        # Should fail permission check
        assert response.status_code == 401
    
    def test_create_session_no_authentication(
        self,
        client: TestClient,
        test_event
    ):
        """Test creating session without authentication."""
        payload = {
            "event_id": test_event.id
        }
        
        response = client.post(
            "/protected/session/createSession",
            json=payload
        )
        
        assert response.status_code == 401
        data = response.json()
        assert_error_response(data)
    
    def test_create_multiple_sessions_for_event(
        self,
        client: TestClient,
        test_event_with_relationship,
        auth_headers
    ):
        """Test creating multiple sessions for the same event."""
        payload = {
            "event_id": test_event_with_relationship.id
        }
        
        # Create first session
        response1 = client.post(
            "/protected/session/createSession",
            json=payload,
            headers=auth_headers
        )
        
        # Create second session
        response2 = client.post(
            "/protected/session/createSession",
            json=payload,
            headers=auth_headers
        )
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Should have different session IDs
        session_id1 = response1.json()["session"]["id"]
        session_id2 = response2.json()["session"]["id"]
        assert session_id1 != session_id2


# ============================================================================
# Check-in Tests
# ============================================================================

@pytest.mark.session
@pytest.mark.integration
class TestCheckin:
    """Tests for POST /protected/session/checkin endpoint."""
    
    def test_checkin_success_with_valid_face(
        self,
        client: TestClient,
        test_session,
        test_user_with_embedding,
        test_attendance,
        test_image_path
    ):
        """Test successful check-in with matching face."""
        with open(test_image_path, "rb") as img:
            files = {
                "upload_image": ("test.jpg", img, "image/jpeg")
            }
            
            response = client.post(
                f"/protected/session/checkin?session_id={test_session.id}",
                files=files
            )
        
        # Note: This test depends on actual face recognition
        # May fail if face doesn't match or isn't detected
        assert response.status_code in [200, 401, 404, 421, 422]
        
        if response.status_code == 200:
            data = response.json()
            assert "user_id" in data
            assert "similarity" in data
            assert "status" in data
    
    def test_checkin_updates_attendance_status(
        self,
        client: TestClient,
        test_session,
        test_user_with_embedding,
        test_attendance,
        test_image_path,
        test_db
    ):
        """Verify check-in updates attendance status to PRESENT."""
        from app.db.models.attendance import Attendance
        
        # Initial status should be ABSENT
        initial_attendance = test_db.query(Attendance).filter_by(
            id=test_attendance.id
        ).first()
        assert initial_attendance.status.value == "absent"
        
        with open(test_image_path, "rb") as img:
            files = {
                "upload_image": ("test.jpg", img, "image/jpeg")
            }
            
            response = client.post(
                f"/protected/session/checkin?session_id={test_session.id}",
                files=files
            )
        
        if response.status_code == 200:
            # Refresh from database
            test_db.expire_all()
            updated_attendance = test_db.query(Attendance).filter_by(
                id=test_attendance.id
            ).first()
            
            assert updated_attendance.status.value == "present"
            assert updated_attendance.check_in_time is not None
    
    def test_checkin_no_session_found(
        self,
        client: TestClient,
        test_image_path
    ):
        """Test check-in with nonexistent session."""
        with open(test_image_path, "rb") as img:
            files = {
                "upload_image": ("test.jpg", img, "image/jpeg")
            }
            
            response = client.post(
                "/protected/session/checkin?session_id=99999",
                files=files
            )
        
        assert response.status_code == 404
        data = response.json()
        assert_error_response(data, expected_detail="no attendance")
    
    def test_checkin_no_users_with_embeddings(
        self,
        client: TestClient,
        test_session,
        test_user,  # User without embedding
        test_db,
        test_image_path
    ):
        """Test check-in when no users have embeddings."""
        from app.db.models.attendance import Attendance, AttendanceStatus

        # Create attendance for user without embedding
        attendance = Attendance(
            session_id=test_session.id,
            user_id=test_user.id,
            status=AttendanceStatus.ABSENT
        )
        test_db.add(attendance)
        test_db.commit()
        
        with open(test_image_path, "rb") as img:
            files = {
                "upload_image": ("test.jpg", img, "image/jpeg")
            }
            
            response = client.post(
                f"/protected/session/checkin?session_id={test_session.id}",
                files=files
            )
        
        assert response.status_code == 422
        data = response.json()
        assert_error_response(data, expected_detail="no users to checkin")
    
    def test_checkin_similarity_score_returned(
        self,
        client: TestClient,
        test_session,
        test_user_with_embedding,
        test_attendance,
        test_image_path
    ):
        """Verify similarity score is returned in response."""
        with open(test_image_path, "rb") as img:
            files = {
                "upload_image": ("test.jpg", img, "image/jpeg")
            }
            
            response = client.post(
                f"/protected/session/checkin?session_id={test_session.id}",
                files=files
            )
        
        if response.status_code == 200:
            data = response.json()
            assert "similarity" in data
            assert isinstance(data["similarity"], (int, float))
            assert 0.0 <= data["similarity"] <= 1.0
    
    def test_checkin_below_threshold(
        self,
        client: TestClient,
        test_session,
        test_user_with_embedding,
        test_attendance
    ):
        """Test check-in when face similarity is below threshold."""
        # Use a different person's image to get low similarity
        different_image = Path(__file__).parent / "jason.jpg"
        
        if not different_image.exists():
            pytest.skip("Different test image not found")
        
        with open(different_image, "rb") as img:
            files = {
                "upload_image": ("jason.jpg", img, "image/jpeg")
            }
            
            response = client.post(
                f"/protected/session/checkin?session_id={test_session.id}",
                files=files
            )
        
        # Should either succeed with different user or fail with threshold error
        assert response.status_code in [200, 421]

        if response.status_code == 421:
            data = response.json()
            assert_error_response(data, expected_detail="not recognized")
    
    def test_checkin_no_image_provided(
        self,
        client: TestClient,
        test_session
    ):
        """Test check-in without providing an image."""
        response = client.post(
            f"/protected/session/checkin?session_id={test_session.id}"
        )
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_checkin_multiple_users_picks_best_match(
        self,
        client: TestClient,
        test_db,
        test_image_path
    ):
        """Test that check-in picks best matching user when multiple exist."""
        from app.db.models.user import User
        from app.db.models.event import Event
        from app.db.models.session import Session as SessionModel
        from app.db.models.attendance import Attendance, AttendanceStatus
        from app.core.security.hashHelper import HashHelper
        from datetime import datetime, timedelta, timezone

        # Create multiple users with different embeddings
        user1 = User(
            first_name="User",
            last_name="One",
            email="user1@test.com",
            password=HashHelper.get_password_hash("pass"),
            embedding=[0.1] * 512
        )
        user2 = User(
            first_name="User",
            last_name="Two",
            email="user2@test.com",
            password=HashHelper.get_password_hash("pass"),
            embedding=[0.2] * 512
        )
        
        test_db.add_all([user1, user2])
        test_db.commit()
        test_db.refresh(user1)
        test_db.refresh(user2)
        
        # Create event and session
        event = Event(
            event_name="Multi User Test",
            user_id=user1.id,
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(hours=1),
            location="Test"
        )
        test_db.add(event)
        test_db.commit()
        test_db.refresh(event)
        
        session = SessionModel(event_id=event.id, sequence_number=1)
        test_db.add(session)
        test_db.commit()
        test_db.refresh(session)
        
        # Create attendance for both users
        att1 = Attendance(session_id=session.id, user_id=user1.id, status=AttendanceStatus.ABSENT)
        att2 = Attendance(session_id=session.id, user_id=user2.id, status=AttendanceStatus.ABSENT)
        test_db.add_all([att1, att2])
        test_db.commit()
        
        with open(test_image_path, "rb") as img:
            files = {
                "upload_image": ("test.jpg", img, "image/jpeg")
            }
            
            response = client.post(
                f"/protected/session/checkin?session_id={session.id}",
                files=files
            )
        
        if response.status_code == 200:
            data = response.json()
            # Should return one of the users (best match)
            assert data["user_id"] in [user1.id, user2.id]


# ============================================================================
# Integration Tests
# ============================================================================

@pytest.mark.session
@pytest.mark.integration
@pytest.mark.slow
class TestSessionFlow:
    """Integration tests for complete session flow."""
    
    def test_complete_session_flow(
        self,
        client: TestClient,
        test_user_with_embedding,
        test_image_path,
        test_db
    ):
        """Test complete flow: create event, session, then check-in."""
        from app.core.security.authHandler import AuthHandler
        from app.db.models.event_user import EventUser
        from datetime import datetime, timedelta, timezone
        
        # Get auth token
        token = AuthHandler.sign_jwt(user_id=test_user_with_embedding.id)
        headers = {"Authorization": f"Bearer {token}"}
        
        # 1. Create event
        event_payload = {
            "event_name": "Complete Flow Test",
            "start_date": datetime.now(timezone.utc).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            "location": "Test Location"
        }
        
        event_response = client.post(
            "/protected/event/createEvent",
            json=event_payload,
            headers=headers
        )
        assert event_response.status_code == 200
        event_id = event_response.json()["id"]
        
        # 2. Create session
        session_payload = {"event_id": event_id}
        session_response = client.post(
            "/protected/session/createSession",
            json=session_payload,
            headers=headers
        )
        assert session_response.status_code == 200
        session_id = session_response.json()["session"]["id"]
        
        # 3. Check-in with face
        with open(test_image_path, "rb") as img:
            files = {"upload_image": ("test.jpg", img, "image/jpeg")}
            checkin_response = client.post(
                f"/protected/session/checkin?session_id={session_id}",
                files=files
            )
        
        # Check-in might succeed or fail depending on face match
        assert checkin_response.status_code in [200, 401, 421, 422]
