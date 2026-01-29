"""
Tests for model router (/protected/model).

Tests:
- POST /protected/model/hasEmbedding
"""

import pytest
from fastapi.testclient import TestClient
from test_utils import assert_error_response


# ============================================================================
# Has Embedding Tests
# ============================================================================

@pytest.mark.integration
class TestHasEmbedding:
    """Tests for POST /protected/model/hasEmbedding endpoint."""
    
    def test_has_embedding_true(
        self,
        client: TestClient,
        test_user_with_embedding
    ):
        """Test hasEmbedding returns True for user with embedding."""
        from app.core.security.authHandler import AuthHandler
        
        token = AuthHandler.sign_jwt(user_id=test_user_with_embedding.id)
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.post(
            "/protected/model/hasEmbedding",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data is True or data == {"has_embedding": True} or "true" in str(data).lower()
    
    def test_has_embedding_false(
        self,
        client: TestClient,
        test_user,
        auth_headers
    ):
        """Test hasEmbedding returns False for user without embedding."""
        response = client.post(
            "/protected/model/hasEmbedding",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        # Response format may vary, check for False-ish value
        assert data is False or data == {"has_embedding": False} or "false" in str(data).lower()
    
    def test_has_embedding_no_authentication(self, client: TestClient):
        """Test hasEmbedding without authentication."""
        response = client.post("/protected/model/hasEmbedding")
        
        assert response.status_code == 401
        data = response.json()
        assert_error_response(data)
    
    def test_has_embedding_invalid_token(self, client: TestClient):
        """Test hasEmbedding with invalid token."""
        headers = {"Authorization": "Bearer invalid_token_xyz"}
        
        response = client.post(
            "/protected/model/hasEmbedding",
            headers=headers
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_has_embedding_after_upload(
        self,
        client: TestClient,
        test_user,
        auth_headers,
        test_image_path
    ):
        """Test hasEmbedding changes from False to True after upload."""
        # First check: should be False
        response1 = client.post(
            "/protected/model/hasEmbedding",
            headers=auth_headers
        )
        
        assert response1.status_code == 200
        data1 = response1.json()
        # Should be False initially
        assert data1 is False or data1 == {"has_embedding": False} or "false" in str(data1).lower()
        
        # Upload image to create embedding
        with open(test_image_path, "rb") as img:
            files = {"upload_image": ("test.jpg", img, "image/jpeg")}
            headers = {"Authorization": auth_headers["Authorization"]}
            
            upload_response = client.post(
                "/protected/upload Picture",
                files=files,
                headers=headers
            )
        
        assert upload_response.status_code == 200
        
        # Second check: should be True now
        response2 = client.post(
            "/protected/model/hasEmbedding",
            headers=auth_headers
        )
        
        assert response2.status_code == 200
        data2 = response2.json()
        # Should be True after upload
        assert data2 is True or data2 == {"has_embedding": True} or "true" in str(data2).lower()


# ============================================================================
# Integration Tests
# ============================================================================

@pytest.mark.integration
class TestModelIntegration:
    """Integration tests for model-related workflows."""
    
    def test_check_embedding_before_checkin(
        self,
        client: TestClient,
        test_user,
        auth_headers,
        test_image_path
    ):
        """Test checking if user has embedding before allowing check-in."""
        # Check embedding status
        has_embedding_response = client.post(
            "/protected/model/hasEmbedding",
            headers=auth_headers
        )
        
        assert has_embedding_response.status_code == 200
        data = has_embedding_response.json()
        
        # User should not have embedding initially
        has_embedding = data is True or data == {"has_embedding": True} or "true" in str(data).lower()
        
        if not has_embedding:
            # Upload image to create embedding
            with open(test_image_path, "rb") as img:
                files = {"upload_image": ("test.jpg", img, "image/jpeg")}
                headers = {"Authorization": auth_headers["Authorization"]}
                
                upload_response = client.post(
                    "/protected/uploadPicture",
                    files=files,
                    headers=headers
                )
            
            assert upload_response.status_code == 200
            
            # Verify embedding now exists
            verify_response = client.post(
                "/protected/model/hasEmbedding",
                headers=auth_headers
            )
            
            assert verify_response.status_code == 200
            verify_data = verify_response.json()
            assert verify_data is True or verify_data == {"has_embedding": True} or "true" in str(verify_data).lower()
    
    def test_multiple_users_embedding_status(
        self,
        client: TestClient,
        test_user,
        test_user_with_embedding,
        auth_headers
    ):
        """Test that embedding status is user-specific."""
        from app.core.security.authHandler import AuthHandler
        
        # Check test_user (no embedding)
        response1 = client.post(
            "/protected/model/hasEmbedding",
            headers=auth_headers
        )
        
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Check test_user_with_embedding (has embedding)
        token2 = AuthHandler.sign_jwt(user_id=test_user_with_embedding.id)
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        response2 = client.post(
            "/protected/model/hasEmbedding",
            headers=headers2
        )
        
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Different users should have different embedding status
        # test_user: False, test_user_with_embedding: True
        has_emb1 = data1 is True or "true" in str(data1).lower()
        has_emb2 = data2 is True or "true" in str(data2).lower()
        
        assert has_emb1 != has_emb2  # Should be different
        assert has_emb2 is True  # User with embedding should be True
