# VeriFace Backend Test Suite

Comprehensive test suite for all backend routers using pytest, SQLite in-memory database, and real test images.

## Test Structure

```
test/
├── conftest.py                 # Shared fixtures and database setup
├── test_utils.py              # Helper functions for tests
├── test_auth.py               # Auth router tests (/auth)
├── test_protected.py          # Protected router tests (/protected)
├── test_event.py              # Event router tests (/protected/event)
├── test_session.py            # Session router tests (/protected/session)
├── test_model.py              # Model router tests (/protected/model)
├── kien.jpg                   # Test image for face recognition
├── jason.jpg                  # Test image
├── hector.jpg                 # Test image
├── syn.jpg                    # Test image
└── test_img.png               # Test PNG image
```

## Running Tests

### Install Dependencies

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

### Run All Tests

```bash
cd backend
pytest test/ -v
```

### Run Specific Test File

```bash
pytest test/test_auth.py -v                 # Auth tests
pytest test/test_protected.py -v            # Protected endpoint tests
pytest test/test_event.py -v                # Event management tests
pytest test/test_session.py -v              # Session & attendance tests
pytest test/test_model.py -v                # Model/embedding tests
```

### Run Single Test

```bash
pytest test/test_auth.py::TestSignup::test_signup_success -v
pytest test/test_event.py::TestCreateEvent::test_create_event_success -v
```

### Run Tests by Marker

```bash
pytest test/ -m auth -v          # Authentication tests only
pytest test/ -m event -v         # Event tests only
pytest test/ -m session -v       # Session tests only
pytest test/ -m integration -v   # Integration tests only
pytest test/ -m "not slow" -v    # Skip slow tests
```

### Coverage Report

```bash
pytest test/ --cov=app --cov-report=html --cov-report=term
# Open htmlcov/index.html in browser to see detailed coverage
```

## Test Coverage

### Auth Router (`test_auth.py`)
- ✅ POST /auth/signup - Success, duplicate email, invalid formats
- ✅ POST /auth/login - Success, wrong password, nonexistent user
- ✅ Password hashing verification
- ✅ JWT token generation and format

### Protected Router (`test_protected.py`)
- ✅ GET /protected/testToken - Valid/invalid tokens, authentication
- ✅ POST /protected/uploadPicture - Image upload, embedding storage
- ✅ Token validation edge cases

### Event Router (`test_event.py`)
- ✅ POST /protected/event/createEvent - Create events, duplicate names
- ✅ POST /protected/event/removeEvent - Delete with permissions
- ✅ POST /protected/event/addEventUserRelationship - Add users to events
- ✅ POST /protected/event/removeEventUserRelationship - Remove users
- ✅ POST /protected/event/getUsers - List event participants
- ✅ GET/POST event retrieval endpoints

### Session Router (`test_session.py`)
- ✅ POST /protected/session/createSession - Create sessions, attendance auto-creation
- ✅ POST /protected/session/checkin - Face recognition check-in
- ✅ Similarity scoring and matching
- ✅ Edge cases: no face, multiple faces, threshold validation

### Model Router (`test_model.py`)
- ✅ POST /protected/model/hasEmbedding - Check embedding status
- ✅ Before/after upload verification

## Test Fixtures

Key fixtures available in `conftest.py`:

- `client` - FastAPI TestClient with test database
- `test_db` - SQLite in-memory database session
- `test_user` - Basic test user
- `test_user_with_embedding` - User with face embedding
- `auth_headers` - Authentication headers with valid token
- `test_event` - Sample event
- `test_event_with_relationship` - Event with EventUser relationship
- `test_session` - Sample session
- `test_attendance` - Sample attendance record
- `test_image_path` - Path to test image
- `multiple_test_images` - Dictionary of available test images

## Writing New Tests

### Example Test Structure

```python
import pytest
from fastapi.testclient import TestClient

@pytest.mark.integration
class TestMyFeature:
    """Tests for my feature."""
    
    def test_feature_success(self, client: TestClient, auth_headers):
        """Test successful case."""
        response = client.post(
            "/my/endpoint",
            json={"data": "value"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "expected_field" in data
```

### Using Test Utilities

```python
from test.test_utils import (
    create_test_user_payload,
    create_test_event_payload,
    assert_user_response,
    assert_event_response,
    assert_error_response
)

def test_example(client: TestClient):
    payload = create_test_user_payload(email="test@example.com")
    response = client.post("/auth/signup", json=payload)
    assert_user_response(response.json(), expected_email="test@example.com")
```

## Known Issues

1. **File Naming Inconsistencies** - Some service files use PascalCase (EventUserService.py, ModelService.py) instead of camelCase. This may cause import issues. See root AGENTS.md for details.

2. **Image Processing Tests** - Tests involving face recognition may be slow or unreliable depending on:
   - Image quality
   - Face detection success
   - Similarity threshold settings

3. **Database State** - Tests use SQLite in-memory database which doesn't support all PostgreSQL features (e.g., ARRAY columns may behave differently).

## Test Markers

- `@pytest.mark.unit` - Fast, isolated unit tests
- `@pytest.mark.integration` - Integration tests with database
- `@pytest.mark.auth` - Authentication tests
- `@pytest.mark.event` - Event management tests
- `@pytest.mark.session` - Session/attendance tests
- `@pytest.mark.slow` - Slow-running tests (skip with `-m "not slow"`)

## CI/CD Integration

To integrate with GitHub Actions or other CI:

```yaml
- name: Run Tests
  run: |
    cd backend
    source .venv/bin/activate
    pytest test/ --cov=app --cov-report=xml
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./backend/coverage.xml
```

## Troubleshooting

### ImportError: No module named 'app.service.EventUserService'

Fix file naming inconsistency:
```bash
cd backend/app/service
mv EventUserService.py eventUserService.py
mv ModelService.py modelService.py
```

Then update imports in routers.

### Tests failing with database errors

Ensure you're using the test database fixture:
```python
def test_example(test_db: Session, client: TestClient):
    # test_db is automatically used by client
```

### Image upload tests failing

Check that test images exist:
```bash
ls -la backend/test/*.jpg
```

## Contributing

When adding new endpoints:
1. Add tests to appropriate test file
2. Ensure both success and error cases are tested
3. Use appropriate markers (`@pytest.mark.integration`, etc.)
4. Run coverage report to verify new code is tested
5. Aim for 80%+ coverage

## Contact

For questions about the test suite, refer to the main AGENTS.md file or contact the development team.
