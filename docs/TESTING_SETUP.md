# VeriFace Testing Setup - PostgreSQL Edition

## 🎉 What's Been Created

A comprehensive unit test suite for all backend routers with **90+ test cases** using **PostgreSQL (Supabase)** for realistic testing.

### ✅ Why PostgreSQL Instead of SQLite?

- **Consistency**: Same database as production (supports ARRAY types, same SQL dialect)
- **Realistic**: Tests use actual PostgreSQL features like ARRAY for embeddings
- **No mocking needed**: Real database behavior, no compatibility hacks
- **Transaction isolation**: Each test runs in a transaction that's rolled back automatically

## 📦 Files Created

```
backend/
├── pytest.ini                  # Pytest configuration
├── conftest.py                 # Test fixtures with PostgreSQL setup
├── test/
│   ├── __init__.py            # Makes test a Python package
│   ├── test_utils.py          # Helper functions
│   ├── test_auth.py           # Auth router tests (18 tests)
│   ├── test_protected.py      # Protected router tests (12 tests)
│   ├── test_event.py          # Event router tests (30+ tests)
│   ├── test_session.py        # Session router tests (15+ tests)
│   ├── test_model.py          # Model router tests (6 tests)
│   └── README.md              # Test documentation
└── requirements.txt            # Updated with testing dependencies
```

## 🔧 How It Works

### PostgreSQL Test Database

Tests use your existing Supabase PostgreSQL database but with **transaction rollback**:

1. Test starts → Begin transaction
2. Test runs → All database changes happen in transaction
3. Test ends → **Rollback transaction** (all changes undone)
4. Database stays clean ✨

This means:
- ✅ No test data pollution
- ✅ Tests are isolated from each other
- ✅ Production-like environment
- ✅ No cleanup scripts needed

## 🚀 Running Tests

### Install Dependencies (First Time)

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

### Run All Tests

```bash
cd backend
source .venv/bin/activate
pytest test/ -v
```

### Run Specific Test File

```bash
pytest test/test_auth.py -v                 # Auth tests ✅ WORKING
pytest test/test_protected.py -v            # Protected endpoint tests
pytest test/test_event.py -v                # Event management tests
pytest test/test_session.py -v              # Session & attendance tests
pytest test/test_model.py -v                # Model/embedding tests
```

### Run Single Test

```bash
pytest test/test_auth.py::TestSignup::test_signup_success -v
pytest test/test_auth.py::TestLogin::test_login_success -v
```

### Run by Category

```bash
pytest test/ -m auth -v          # Auth tests only
pytest test/ -m event -v         # Event tests only
pytest test/ -m session -v       # Session tests only
pytest test/ -m integration -v   # Integration tests only
pytest test/ -m "not slow" -v    # Skip slow tests
```

### Run with Coverage

```bash
pytest test/ --cov=app --cov-report=html --cov-report=term
# Open htmlcov/index.html in browser to see detailed coverage
```

## ✅ Test Status

### Currently Working

- ✅ **Auth Tests** - All 7 signup tests passing!
  - User registration
  - Password hashing
  - Duplicate email detection
  - Validation errors
  - Embedding support

### To Be Verified

- ⏳ Login tests
- ⏳ Protected endpoint tests
- ⏳ Event management tests
- ⏳ Session/check-in tests
- ⏳ Model tests

## 📊 Test Coverage

**Total Test Cases: 90+**

- Auth: 18 tests (signup, login, token validation)
- Protected: 12 tests (authentication, image upload)
- Event: 30+ tests (CRUD, permissions, relationships)
- Session: 15+ tests (create session, check-in, face recognition)
- Model: 6 tests (embedding status checks)

## 🔒 Database Safety

### Transaction Isolation

Each test runs in its own transaction:

```python
@pytest.fixture(scope="function")
def test_db():
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    
    yield session  # Test runs here
    
    transaction.rollback()  # Undo everything!
    connection.close()
```

### What Gets Rolled Back

- ✅ User creations
- ✅ Event creations
- ✅ Session data
- ✅ Attendance records
- ✅ All INSERT/UPDATE/DELETE operations

### What Stays

- ✅ Existing production data (untouched)
- ✅ Database schema (unchanged)
- ✅ Your manual test users

## 🎯 Test Features

- **PostgreSQL Native** - Uses real PostgreSQL, not SQLite
- **ARRAY Type Support** - Embeddings work exactly like production
- **Real Test Images** - Uses existing kien.jpg, jason.jpg, etc.
- **Comprehensive Fixtures** - Easy test data setup in conftest.py
- **Pytest Markers** - Filter tests by category
- **High Coverage** - Tests success paths, errors, edge cases
- **Integration Tests** - Complete workflows (signup → login → event → check-in)
- **Auto-cleanup** - Transaction rollback, no manual cleanup needed

## 📝 Example Test Run

```bash
$ pytest test/test_auth.py::TestSignup -v

test/test_auth.py::TestSignup::test_signup_success PASSED           [ 14%]
test/test_auth.py::TestSignup::test_signup_minimal_fields PASSED    [ 28%]
test/test_auth.py::TestSignup::test_signup_duplicate_email PASSED   [ 42%]
test/test_auth.py::TestSignup::test_signup_invalid_email_format PASSED [ 57%]
test/test_auth.py::TestSignup::test_signup_missing_email PASSED     [ 71%]
test/test_auth.py::TestSignup::test_signup_password_is_hashed PASSED[ 85%]
test/test_auth.py::TestSignup::test_signup_with_embedding PASSED    [100%]

======================== 7 passed in 12.98s =========================
```

## 🐛 Troubleshooting

### Tests are slow

This is normal - PostgreSQL tests are slower than in-memory SQLite, but more realistic.

**Tips to speed up:**
```bash
# Run tests in parallel (requires pytest-xdist)
pip install pytest-xdist
pytest test/ -n auto  # Uses all CPU cores
```

### Database connection errors

Check your `.env` file has correct Supabase credentials:
```env
user=your_user
password=your_password
host=your_host
port=5432
dbname=postgres
```

### "Too many connections"

If you see connection errors, make sure tests are cleaning up properly.
Each test should close its connection via transaction rollback.

### Test data showing up in database

This shouldn't happen! Each test uses transaction rollback.

If you see test data:
1. Make sure you're using the `test_db` fixture
2. Check the test didn't call `session.commit()` directly
3. The fixture should automatically rollback

## 📚 Writing New Tests

### Example Test Structure

```python
import pytest
from fastapi.testclient import TestClient

@pytest.mark.integration
class TestMyFeature:
    """Tests for my feature."""
    
    def test_feature_success(self, client: TestClient, auth_headers, test_db):
        """Test successful case."""
        # test_db ensures transaction isolation
        response = client.post(
            "/my/endpoint",
            json={"data": "value"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        # All changes will be rolled back automatically!
```

### Using Fixtures

Available fixtures in `conftest.py`:

- `client` - FastAPI TestClient
- `test_db` - PostgreSQL database session (with rollback)
- `test_user` - Basic test user
- `test_user_with_embedding` - User with face embedding
- `auth_headers` - Authentication headers with valid token
- `test_event` - Sample event
- `test_session` - Sample session
- `test_image_path` - Path to test image
- `multiple_test_images` - Dictionary of test images

## 💡 Best Practices

### ✅ DO

- Use `test_db` fixture for database isolation
- Use fixtures for common test data
- Test both success and error cases
- Add markers (`@pytest.mark.integration`, etc.)
- Write descriptive test names and docstrings

### ❌ DON'T

- Don't call `session.commit()` directly in tests
- Don't rely on data from previous tests
- Don't create users with production email addresses
- Don't skip the `test_db` fixture

## 🎓 What's Different from TESTING_SETUP.md (Old)

### Old Approach (SQLite)
- ❌ Used SQLite in-memory
- ❌ Couldn't use PostgreSQL ARRAY type
- ❌ Needed type conversion hacks
- ❌ Different from production

### New Approach (PostgreSQL)
- ✅ Uses real PostgreSQL (Supabase)
- ✅ Full support for ARRAY and other PG features
- ✅ No type conversion needed
- ✅ Identical to production environment
- ✅ Transaction rollback for isolation

## 📖 Additional Resources

- **test/README.md** - Detailed test documentation
- **AGENTS.md** - Pytest commands reference
- **conftest.py** - Fixture implementations

## ✨ Quick Start

```bash
# 1. Ensure you have .env with Supabase credentials
cd backend

# 2. Install dependencies
source .venv/bin/activate
pip install -r requirements.txt

# 3. Run tests!
pytest test/test_auth.py -v

# 4. Check coverage
pytest test/ --cov=app --cov-report=html
```

That's it! Your tests will run against PostgreSQL and automatically clean up after themselves. 🎉
