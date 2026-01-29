"""
Tests for authentication router (/auth).

Tests:
- POST /auth/signup
- POST /auth/login
"""

import pytest
from fastapi.testclient import TestClient
from test_utils import create_test_user_payload, assert_user_response, assert_error_response


# ============================================================================
# Signup Tests
# ============================================================================

@pytest.mark.auth
@pytest.mark.integration
class TestSignup:
    """Tests for POST /auth/signup endpoint."""
    
    def test_signup_success(self, client: TestClient):
        """Test successful user signup with valid data."""
        payload = create_test_user_payload(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            password="securepass123"
        )
        
        response = client.post("/auth/signup", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert_user_response(data, expected_email="john@example.com")
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"
    
    def test_signup_minimal_fields(self, client: TestClient):
        """Test signup with only required fields (email and password)."""
        payload = {
            "first_name": "Min",
            "last_name": "User",
            "email": "minimal@example.com",
            "password": "password123"
        }
        
        response = client.post("/auth/signup", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "minimal@example.com"
        assert data["first_name"] == "Min"
        assert data["last_name"] == "User"
    
    def test_signup_duplicate_email(self, client: TestClient, test_user):
        """Test signup with an email that already exists."""
        payload = create_test_user_payload(
            email=test_user.email,
            password="differentpass"
        )
        
        response = client.post("/auth/signup", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert_error_response(data, expected_detail="email exist")
    
    def test_signup_invalid_email_format(self, client: TestClient):
        """Test signup with invalid email format."""
        payload = create_test_user_payload(
            email="not-an-email"
        )
        
        response = client.post("/auth/signup", json=payload)
        
        assert response.status_code == 422  # Pydantic validation error
        data = response.json()
        assert "detail" in data
    
    def test_signup_missing_email(self, client: TestClient):
        """Test signup without email (required field)."""
        payload = {
            "first_name": "Test",
            "last_name": "User",
            "password": "password123"
        }
        
        response = client.post("/auth/signup", json=payload)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_signup_password_is_hashed(self, client: TestClient, test_db):
        """Ensure password is hashed before storing in database."""
        from app.db.models.user import User
        
        payload = create_test_user_payload(
            email="hash@example.com",
            password="plaintextpassword"
        )
        
        response = client.post("/auth/signup", json=payload)
        assert response.status_code == 201
        
        # Query database directly
        user = test_db.query(User).filter_by(email="hash@example.com").first()
        assert user is not None
        assert user.password != "plaintextpassword"  # Should be hashed
        assert user.password.startswith("$2")  # bcrypt hash starts with $2
    
    def test_signup_with_embedding(self, client: TestClient):
        """Test signup with embedding data (optional field)."""
        dummy_embedding = [0.5] * 512  # FaceNet 512-dim vector
        
        payload = create_test_user_payload(
            email="embedded@example.com",
            embedding=dummy_embedding
        )
        
        response = client.post("/auth/signup", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "embedded@example.com"


# ============================================================================
# Login Tests
# ============================================================================

@pytest.mark.auth
@pytest.mark.integration
class TestLogin:
    """Tests for POST /auth/login endpoint."""
    
    def test_login_success(self, client: TestClient, test_user, test_user_data):
        """Test successful login with valid credentials."""
        payload = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        
        response = client.post("/auth/login", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0
    
    def test_login_token_format(self, client: TestClient, test_user, test_user_data):
        """Verify JWT token format."""
        payload = {
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        }
        
        response = client.post("/auth/login", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        token = data["token"]
        
        # JWT tokens have 3 parts separated by dots
        parts = token.split(".")
        assert len(parts) == 3
    
    def test_login_wrong_password(self, client: TestClient, test_user):
        """Test login with incorrect password."""
        payload = {
            "email": test_user.email,
            "password": "wrongpassword"
        }
        
        response = client.post("/auth/login", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert_error_response(data, expected_detail="password")
    
    def test_login_nonexistent_email(self, client: TestClient):
        """Test login with email that doesn't exist."""
        payload = {
            "email": "nonexistent@example.com",
            "password": "somepassword"
        }
        
        response = client.post("/auth/login", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert_error_response(data, expected_detail="incorrect email or password.")
    
    def test_login_missing_email(self, client: TestClient):
        """Test login without email."""
        payload = {
            "password": "password123"
        }
        
        response = client.post("/auth/login", json=payload)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_login_missing_password(self, client: TestClient, test_user):
        """Test login without password."""
        payload = {
            "email": test_user.email
        }
        
        response = client.post("/auth/login", json=payload)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_login_invalid_email_format(self, client: TestClient):
        """Test login with invalid email format."""
        payload = {
            "email": "not-an-email",
            "password": "password123"
        }
        
        response = client.post("/auth/login", json=payload)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_login_empty_credentials(self, client: TestClient):
        """Test login with empty email and password."""
        payload = {
            "email": "",
            "password": ""
        }
        
        response = client.post("/auth/login", json=payload)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data


# ============================================================================
# Integration Tests
# ============================================================================

@pytest.mark.auth
@pytest.mark.integration
class TestAuthFlow:
    """Integration tests for complete auth flow."""
    
    def test_signup_then_login(self, client: TestClient):
        """Test complete flow: signup then login with same credentials."""
        # Signup
        signup_payload = create_test_user_payload(
            email="flow@example.com",
            password="flowpass123"
        )
        
        signup_response = client.post("/auth/signup", json=signup_payload)
        assert signup_response.status_code == 201
        
        # Login with same credentials
        login_payload = {
            "email": "flow@example.com",
            "password": "flowpass123"
        }
        
        login_response = client.post("/auth/login", json=login_payload)
        assert login_response.status_code == 200
        
        data = login_response.json()
        assert "token" in data
    
    def test_multiple_users_separate_tokens(
        self, 
        client: TestClient, 
        test_user, 
        second_test_user,
        test_user_data
    ):
        """Test that different users get different tokens."""
        # Login as first user
        login1 = client.post("/auth/login", json={
            "email": test_user.email,
            "password": test_user_data["password"]
        })
        token1 = login1.json()["token"]
        
        # Login as second user
        login2 = client.post("/auth/login", json={
            "email": second_test_user.email,
            "password": "password456"  # From conftest
        })
        token2 = login2.json()["token"]
        
        # Tokens should be different
        assert token1 != token2
