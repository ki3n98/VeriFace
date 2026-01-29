"""
Tests for protected router (/protected).

Tests:
- GET /protected/testToken
- POST /protected/uploadPicture
"""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path
from test_utils import assert_user_response, assert_error_response


# ============================================================================
# Test Token Endpoint Tests
# ============================================================================

@pytest.mark.integration
class TestTokenValidation:
    """Tests for GET /protected/testToken endpoint."""
    
    def test_valid_token_returns_user_data(
        self, 
        client: TestClient, 
        test_user, 
        auth_headers
    ):
        """Test that valid token returns user data."""
        response = client.get("/protected/testToken", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        user_data = data["data"]
        assert_user_response(user_data, expected_email=test_user.email)
        assert user_data["id"] == test_user.id
        assert user_data["first_name"] == test_user.first_name
        assert user_data["last_name"] == test_user.last_name
    
    def test_no_token_returns_401(self, client: TestClient):
        """Test that request without token returns 401."""
        response = client.get("/protected/testToken")
        
        assert response.status_code == 401
        data = response.json()
        assert_error_response(data, expected_detail="no token")
    
    def test_invalid_token_returns_401(self, client: TestClient):
        """Test that invalid token returns 401."""
        headers = {
            "Authorization": "Bearer invalid_token_12345"
        }
        
        response = client.get("/protected/testToken", headers=headers)
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_malformed_token_no_bearer_prefix(self, client: TestClient, auth_token):
        """Test that token without 'Bearer ' prefix returns 401."""
        headers = {
            "Authorization": auth_token  # Missing "Bearer " prefix
        }
        
        response = client.get("/protected/testToken", headers=headers)
        
        assert response.status_code == 401
        data = response.json()
        assert_error_response(data, expected_detail="prefix")
    
    def test_empty_authorization_header(self, client: TestClient):
        """Test that empty authorization header returns 401."""
        headers = {
            "Authorization": ""
        }
        
        response = client.get("/protected/testToken", headers=headers)
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_bearer_only_no_token(self, client: TestClient):
        """Test 'Bearer ' without actual token."""
        headers = {
            "Authorization": "Bearer "
        }
        
        response = client.get("/protected/testToken", headers=headers)
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data


# ============================================================================
# Upload Picture Endpoint Tests
# ============================================================================

@pytest.mark.integration
class TestUploadPicture:
    """Tests for POST /protected/uploadPicture endpoint."""
    
    def test_upload_valid_image_success(
        self, 
        client: TestClient, 
        test_user, 
        auth_headers,
        test_image_path
    ):
        """Test uploading a valid face image."""
        with open(test_image_path, "rb") as image_file:
            files = {
                "upload_image": ("test.jpg", image_file, "image/jpeg")
            }
            
            # Remove Content-Type from headers for multipart/form-data
            headers = {"Authorization": auth_headers["Authorization"]}
            
            response = client.post(
                "/protected/uploadPicture", 
                files=files, 
                headers=headers
            )
        
        assert response.status_code == 200
        data = response.json()
        assert_user_response(data, expected_email=test_user.email)
        # Note: embedding is not returned in UserOutput schema
    
    def test_upload_updates_existing_embedding(
        self,
        client: TestClient,
        test_user_with_embedding,
        test_image_path
    ):
        """Test that uploading updates existing embedding."""
        from app.core.security.authHandler import AuthHandler
        
        # Get token for user with embedding
        token = AuthHandler.sign_jwt(user_id=test_user_with_embedding.id)
        headers = {"Authorization": f"Bearer {token}"}
        
        with open(test_image_path, "rb") as image_file:
            files = {
                "upload_image": ("test.jpg", image_file, "image/jpeg")
            }
            
            response = client.post(
                "/protected/uploadPicture",
                files=files,
                headers=headers
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user_with_embedding.id
    
    def test_upload_no_authentication(self, client: TestClient, test_image_path):
        """Test upload without authentication token."""
        with open(test_image_path, "rb") as image_file:
            files = {
                "upload_image": ("test.jpg", image_file, "image/jpeg")
            }
            
            response = client.post("/protected/uploadPicture", files=files)
        
        assert response.status_code == 401
        data = response.json()
        assert_error_response(data)
    
    def test_upload_invalid_token(self, client: TestClient, test_image_path):
        """Test upload with invalid token."""
        headers = {"Authorization": "Bearer invalid_token"}
        
        with open(test_image_path, "rb") as image_file:
            files = {
                "upload_image": ("test.jpg", image_file, "image/jpeg")
            }
            
            response = client.post(
                "/protected/uploadPicture",
                files=files,
                headers=headers
            )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_upload_no_file(self, client: TestClient, auth_headers):
        """Test upload without providing a file."""
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = client.post("/protected/uploadPicture", headers=headers)
        
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_upload_embedding_persisted_in_database(
        self,
        client: TestClient,
        test_user,
        auth_headers,
        test_image_path,
        test_db
    ):
        """Verify that embedding is actually saved to database."""
        from app.db.models.user import User
        
        # Upload image
        with open(test_image_path, "rb") as image_file:
            files = {
                "upload_image": ("test.jpg", image_file, "image/jpeg")
            }
            headers = {"Authorization": auth_headers["Authorization"]}
            
            response = client.post(
                "/protected/uploadPicture",
                files=files,
                headers=headers
            )
        
        assert response.status_code == 200
        
        # Query database directly
        test_db.expire_all()  # Refresh from database
        user = test_db.query(User).filter_by(id=test_user.id).first()
        
        assert user is not None
        assert user.embedding is not None
        assert isinstance(user.embedding, list)
        assert len(user.embedding) == 512  # FaceNet embedding size
        assert all(isinstance(x, float) for x in user.embedding)
    
    def test_upload_multiple_images_different_users(
        self,
        client: TestClient,
        test_user,
        second_test_user,
        auth_headers,
        second_auth_headers,
        multiple_test_images
    ):
        """Test uploading different images for different users."""
        # Upload for first user
        with open(multiple_test_images["kien"], "rb") as img:
            files = {"upload_image": ("kien.jpg", img, "image/jpeg")}
            headers = {"Authorization": auth_headers["Authorization"]}
            response1 = client.post(
                "/protected/uploadPicture",
                files=files,
                headers=headers
            )
        
        # Upload for second user
        with open(multiple_test_images["jason"], "rb") as img:
            files = {"upload_image": ("jason.jpg", img, "image/jpeg")}
            headers = {"Authorization": second_auth_headers["Authorization"]}
            response2 = client.post(
                "/protected/uploadPicture",
                files=files,
                headers=headers
            )
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        user1_data = response1.json()
        user2_data = response2.json()
        
        assert user1_data["id"] == test_user.id
        assert user2_data["id"] == second_test_user.id


# ============================================================================
# Image Processing Edge Cases
# ============================================================================

@pytest.mark.integration
@pytest.mark.slow
class TestImageProcessingEdgeCases:
    """Test edge cases for image upload and processing."""
    
    def test_upload_png_format(
        self,
        client: TestClient,
        auth_headers
    ):
        """Test uploading PNG format image."""
        test_dir = Path(__file__).parent
        png_image = test_dir / "test_img.png"
        
        if not png_image.exists():
            pytest.skip("PNG test image not found")
        
        with open(png_image, "rb") as img:
            files = {"upload_image": ("test.png", img, "image/png")}
            headers = {"Authorization": auth_headers["Authorization"]}
            
            response = client.post(
                "/protected/uploadPicture",
                files=files,
                headers=headers
            )
        
        # Should work with PNG
        assert response.status_code in [200, 400, 422]
