"""
Tests for CSV upload functionality.

Tests:
- CSV file validation (file type, size)
- CSV parsing and validation
- Column name normalization
- Email validation
- Duplicate detection
- Password generation
- Full integration with endpoint (when implemented)
"""

import pytest
import io
from fastapi import UploadFile
from app.util.csv_processor import (
    validate_csv_file,
    normalize_column_name,
    validate_email_format,
    parse_and_validate_csv,
    generate_random_password
)
from app.db.schema.csv import CSVRowError, CSVUploadSuccess, CSVUploadFailure


# ============================================================================
# Helper Functions
# ============================================================================

def create_csv_upload_file(content: str, filename: str = "test.csv") -> UploadFile:
    """
    Create a mock UploadFile object for testing.
    
    Args:
        content: CSV content as string
        filename: Name of the file
    
    Returns:
        UploadFile object for testing
    """
    file_bytes = content.encode('utf-8')
    file_obj = io.BytesIO(file_bytes)
    
    upload_file = UploadFile(
        filename=filename,
        file=file_obj
    )
    
    return upload_file


def create_valid_csv(num_rows: int = 3) -> str:
    """
    Create valid CSV content with specified number of rows.
    
    Args:
        num_rows: Number of data rows to generate
    
    Returns:
        CSV content as string
    """
    csv_content = "first_name,last_name,email\n"
    for i in range(num_rows):
        csv_content += f"User{i},Test{i},user{i}@example.com\n"
    return csv_content


def create_csv_with_errors(error_type: str) -> str:
    """
    Create CSV content with specific error types for testing.
    
    Args:
        error_type: Type of error to include
            - 'missing_first_name'
            - 'missing_last_name'
            - 'missing_email'
            - 'invalid_email'
            - 'duplicate_email'
            - 'missing_column'
    
    Returns:
        CSV content as string
    """
    if error_type == 'missing_first_name':
        return "first_name,last_name,email\n,Doe,john@example.com\n"
    
    elif error_type == 'missing_last_name':
        return "first_name,last_name,email\nJohn,,john@example.com\n"
    
    elif error_type == 'missing_email':
        return "first_name,last_name,email\nJohn,Doe,\n"
    
    elif error_type == 'invalid_email':
        return "first_name,last_name,email\nJohn,Doe,not-an-email\n"
    
    elif error_type == 'duplicate_email':
        return "first_name,last_name,email\nJohn,Doe,john@example.com\nJane,Smith,john@example.com\n"
    
    elif error_type == 'missing_column':
        return "first_name,last_name\nJohn,Doe\n"
    
    return ""


# ============================================================================
# Unit Tests: validate_csv_file
# ============================================================================

@pytest.mark.unit
class TestValidateCSVFile:
    """Tests for CSV file validation (type and size)."""
    
    @pytest.mark.asyncio
    async def test_valid_csv_file(self):
        """Test validation passes for valid .csv file."""
        csv_content = create_valid_csv(3)
        upload_file = create_csv_upload_file(csv_content, "test.csv")
        
        # Should not raise exception
        await validate_csv_file(upload_file)
    
    @pytest.mark.asyncio
    async def test_invalid_file_type_txt(self):
        """Test validation rejects .txt files."""
        from fastapi import HTTPException
        
        csv_content = create_valid_csv(3)
        upload_file = create_csv_upload_file(csv_content, "test.txt")
        
        with pytest.raises(HTTPException) as exc_info:
            await validate_csv_file(upload_file)
        
        assert exc_info.value.status_code == 400
        assert "invalid file type" in exc_info.value.detail.lower()
    
    @pytest.mark.asyncio
    async def test_invalid_file_type_xlsx(self):
        """Test validation rejects .xlsx files."""
        from fastapi import HTTPException
        
        csv_content = create_valid_csv(3)
        upload_file = create_csv_upload_file(csv_content, "test.xlsx")
        
        with pytest.raises(HTTPException) as exc_info:
            await validate_csv_file(upload_file)
        
        assert exc_info.value.status_code == 400
    
    @pytest.mark.asyncio
    async def test_case_insensitive_csv_extension(self):
        """Test validation accepts .CSV (uppercase)."""
        csv_content = create_valid_csv(3)
        upload_file = create_csv_upload_file(csv_content, "test.CSV")
        
        # Should not raise exception
        await validate_csv_file(upload_file)
    
    @pytest.mark.asyncio
    async def test_file_size_within_limit(self):
        """Test validation passes for file under 20MB."""
        # Create ~1MB of CSV data (well under limit)
        large_csv = create_valid_csv(10000)  # ~500KB
        upload_file = create_csv_upload_file(large_csv, "large.csv")
        
        # Should not raise exception
        await validate_csv_file(upload_file)
    
    @pytest.mark.asyncio
    async def test_file_size_exceeds_limit(self):
        """Test validation rejects files over 20MB."""
        from fastapi import HTTPException
        
        # Create file larger than 20MB
        large_content = "a" * (21 * 1024 * 1024)  # 21MB
        upload_file = create_csv_upload_file(large_content, "too_large.csv")
        
        with pytest.raises(HTTPException) as exc_info:
            await validate_csv_file(upload_file)
        
        assert exc_info.value.status_code == 400
        assert "exceeds maximum limit" in exc_info.value.detail.lower()
    
    @pytest.mark.asyncio
    async def test_file_pointer_reset_after_validation(self):
        """Test that file pointer is reset after validation."""
        csv_content = create_valid_csv(3)
        upload_file = create_csv_upload_file(csv_content, "test.csv")
        
        await validate_csv_file(upload_file)
        
        # File should be readable again from start
        content = await upload_file.read()
        assert len(content) > 0
        assert content.decode('utf-8') == csv_content


# ============================================================================
# Unit Tests: normalize_column_name
# ============================================================================

@pytest.mark.unit
class TestNormalizeColumnName:
    """Tests for column name normalization."""
    
    def test_lowercase_conversion(self):
        """Test conversion to lowercase."""
        assert normalize_column_name("FirstName") == "firstname"
        assert normalize_column_name("EMAIL") == "email"
    
    def test_space_to_underscore(self):
        """Test spaces converted to underscores."""
        assert normalize_column_name("First Name") == "first_name"
        assert normalize_column_name("Last Name") == "last_name"
    
    def test_hyphen_to_underscore(self):
        """Test hyphens converted to underscores."""
        assert normalize_column_name("first-name") == "first_name"
        assert normalize_column_name("e-mail") == "e_mail"
    
    def test_strip_whitespace(self):
        """Test leading/trailing whitespace removed."""
        assert normalize_column_name("  email  ") == "email"
        assert normalize_column_name("\tfirst_name\t") == "first_name"
    
    def test_combined_transformations(self):
        """Test multiple transformations together."""
        assert normalize_column_name("  First-Name  ") == "first_name"
        assert normalize_column_name("Email Address") == "email_address"


# ============================================================================
# Unit Tests: validate_email_format
# ============================================================================

@pytest.mark.unit
class TestValidateEmailFormat:
    """Tests for email format validation using Pydantic EmailStr."""
    
    def test_valid_email_basic(self):
        """Test validation passes for basic valid email."""
        assert validate_email_format("user@example.com") == True
    
    def test_valid_email_with_subdomain(self):
        """Test validation passes for email with subdomain."""
        assert validate_email_format("user@mail.example.com") == True
    
    def test_valid_email_with_plus(self):
        """Test validation passes for email with plus sign."""
        assert validate_email_format("user+tag@example.com") == True
    
    def test_valid_email_with_dots(self):
        """Test validation passes for email with dots."""
        assert validate_email_format("first.last@example.com") == True
    
    def test_invalid_email_missing_at(self):
        """Test validation fails for email missing @ symbol."""
        assert validate_email_format("userexample.com") == False
    
    def test_invalid_email_missing_domain(self):
        """Test validation fails for email missing domain."""
        assert validate_email_format("user@") == False
    
    def test_invalid_email_missing_username(self):
        """Test validation fails for email missing username."""
        assert validate_email_format("@example.com") == False
    
    def test_invalid_email_spaces(self):
        """Test validation fails for email with spaces."""
        assert validate_email_format("user @example.com") == False
        assert validate_email_format("user@ example.com") == False
    
    def test_invalid_email_double_at(self):
        """Test validation fails for email with multiple @ symbols."""
        assert validate_email_format("user@@example.com") == False
    
    def test_empty_email(self):
        """Test validation fails for empty email."""
        assert validate_email_format("") == False


# ============================================================================
# Unit Tests: parse_and_validate_csv
# ============================================================================

@pytest.mark.unit
class TestParseAndValidateCSV:
    """Tests for CSV parsing and validation logic."""
    
    @pytest.mark.asyncio
    async def test_parse_valid_csv_basic(self):
        """Test parsing valid CSV with 3 rows."""
        csv_content = create_valid_csv(3)
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 3
        assert len(error_rows) == 0
        assert valid_rows[0]['first_name'] == "User0"
        assert valid_rows[0]['last_name'] == "Test0"
        assert valid_rows[0]['email'] == "user0@example.com"
    
    @pytest.mark.asyncio
    async def test_parse_csv_with_uppercase_columns(self):
        """Test parsing CSV with uppercase column names."""
        csv_content = "FIRST_NAME,LAST_NAME,EMAIL\nJohn,Doe,john@example.com\n"
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 1
        assert len(error_rows) == 0
    
    @pytest.mark.asyncio
    async def test_parse_csv_with_space_columns(self):
        """Test parsing CSV with space-separated column names."""
        csv_content = "First Name,Last Name,Email\nJohn,Doe,john@example.com\n"
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 1
        assert len(error_rows) == 0
    
    @pytest.mark.asyncio
    async def test_parse_csv_with_extra_columns(self):
        """Test parsing CSV with extra columns (should be ignored)."""
        csv_content = "first_name,last_name,email,phone,address\nJohn,Doe,john@example.com,123-456,123 Main St\n"
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 1
        assert len(error_rows) == 0
        # Extra columns should not be in valid_rows
        assert 'phone' not in valid_rows[0]
        assert 'address' not in valid_rows[0]
    
    @pytest.mark.asyncio
    async def test_missing_required_column_first_name(self):
        """Test error when CSV missing first_name column."""
        from fastapi import HTTPException
        
        csv_content = "last_name,email\nDoe,john@example.com\n"
        upload_file = create_csv_upload_file(csv_content)
        
        with pytest.raises(HTTPException) as exc_info:
            await parse_and_validate_csv(upload_file)
        
        assert exc_info.value.status_code == 400
        assert "missing require columns" in exc_info.value.detail.lower()
    
    @pytest.mark.asyncio
    async def test_missing_required_column_email(self):
        """Test error when CSV missing email column."""
        from fastapi import HTTPException
        
        csv_content = "first_name,last_name\nJohn,Doe\n"
        upload_file = create_csv_upload_file(csv_content)
        
        with pytest.raises(HTTPException) as exc_info:
            await parse_and_validate_csv(upload_file)
        
        assert exc_info.value.status_code == 400
    
    @pytest.mark.asyncio
    async def test_empty_first_name_validation(self):
        """Test validation catches empty first_name."""
        csv_content = create_csv_with_errors('missing_first_name')
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 0
        assert len(error_rows) == 1
        assert error_rows[0]['row_number'] == 2
        assert "first name is required" in error_rows[0]['error_message'].lower()
    
    @pytest.mark.asyncio
    async def test_empty_last_name_validation(self):
        """Test validation catches empty last_name."""
        csv_content = create_csv_with_errors('missing_last_name')
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 0
        assert len(error_rows) == 1
        assert "last name is required" in error_rows[0]['error_message'].lower()
    
    @pytest.mark.asyncio
    async def test_empty_email_validation(self):
        """Test validation catches empty email."""
        csv_content = create_csv_with_errors('missing_email')
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 0
        assert len(error_rows) == 1
        assert "email is required" in error_rows[0]['error_message'].lower()
    
    @pytest.mark.asyncio
    async def test_invalid_email_format_validation(self):
        """Test validation catches invalid email format."""
        csv_content = create_csv_with_errors('invalid_email')
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 0
        assert len(error_rows) == 1
        assert "invalid email format" in error_rows[0]['error_message'].lower()
    
    @pytest.mark.asyncio
    async def test_duplicate_email_detection(self):
        """Test validation catches duplicate emails within CSV."""
        csv_content = create_csv_with_errors('duplicate_email')
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 1  # First occurrence is valid
        assert len(error_rows) == 1  # Second occurrence is error
        assert error_rows[0]['row_number'] == 3
        assert "duplicate email" in error_rows[0]['error_message'].lower()
        assert "row 2" in error_rows[0]['error_message'].lower()
    
    @pytest.mark.asyncio
    async def test_duplicate_email_case_insensitive(self):
        """Test duplicate detection is case-insensitive."""
        csv_content = "first_name,last_name,email\nJohn,Doe,john@example.com\nJane,Doe,JOHN@EXAMPLE.COM\n"
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 1
        assert len(error_rows) == 1
        assert "duplicate email" in error_rows[0]['error_message'].lower()
    
    @pytest.mark.asyncio
    async def test_max_rows_limit_500(self):
        """Test validation enforces 500 row limit."""
        from fastapi import HTTPException
        
        csv_content = create_valid_csv(501)  # 501 rows (exceeds limit)
        upload_file = create_csv_upload_file(csv_content)
        
        with pytest.raises(HTTPException) as exc_info:
            await parse_and_validate_csv(upload_file)
        
        assert exc_info.value.status_code == 400
        assert "exceeds maximum row limit" in exc_info.value.detail.lower()
    
    @pytest.mark.asyncio
    async def test_max_rows_exactly_500(self):
        """Test validation accepts exactly 500 rows."""
        csv_content = create_valid_csv(500)
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 500
        assert len(error_rows) == 0
    
    @pytest.mark.asyncio
    async def test_mixed_valid_and_invalid_rows(self):
        """Test CSV with both valid and invalid rows."""
        csv_content = """first_name,last_name,email
John,Doe,john@example.com
,Smith,jane@example.com
Bob,,bob@example.com
Alice,Wonder,not-an-email
Charlie,Brown,charlie@example.com
"""
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 2  # John and Charlie
        assert len(error_rows) == 3  # Jane (no first), Bob (no last), Alice (bad email)
    
    @pytest.mark.asyncio
    async def test_whitespace_trimming(self):
        """Test that leading/trailing whitespace is trimmed from fields."""
        csv_content = "first_name,last_name,email\n  John  ,  Doe  ,  john@example.com  \n"
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 1
        assert valid_rows[0]['first_name'] == "John"
        assert valid_rows[0]['last_name'] == "Doe"
        assert valid_rows[0]['email'] == "john@example.com"
    
    @pytest.mark.asyncio
    async def test_empty_csv_no_data_rows(self):
        """Test CSV with header but no data rows."""
        csv_content = "first_name,last_name,email\n"
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(valid_rows) == 0
        assert len(error_rows) == 0
    
    @pytest.mark.asyncio
    async def test_row_number_tracking(self):
        """Test that error row numbers are correctly tracked (accounting for header)."""
        csv_content = """first_name,last_name,email
John,Doe,john@example.com
,Smith,error@example.com
Bob,Johnson,bob@example.com
Alice,,alice@example.com
"""
        upload_file = create_csv_upload_file(csv_content)
        
        valid_rows, error_rows = await parse_and_validate_csv(upload_file)
        
        assert len(error_rows) == 2
        # Row 2 in file (line 3, first data row after header = row 2)
        assert error_rows[0]['row_number'] == 3
        # Row 4 in file (line 5)
        assert error_rows[1]['row_number'] == 5


# ============================================================================
# Unit Tests: generate_random_password
# ============================================================================

@pytest.mark.unit
class TestGenerateRandomPassword:
    """Tests for random password generation."""
    
    def test_default_length_14(self):
        """Test password has default length of 14 characters."""
        password = generate_random_password()
        assert len(password) == 14
    
    def test_custom_length(self):
        """Test password respects custom length parameter."""
        password = generate_random_password(length=20)
        assert len(password) == 20
    
    def test_contains_uppercase(self):
        """Test password contains at least one uppercase letter."""
        password = generate_random_password()
        assert any(c.isupper() for c in password)
    
    def test_contains_lowercase(self):
        """Test password contains at least one lowercase letter."""
        password = generate_random_password()
        assert any(c.islower() for c in password)
    
    def test_contains_digit(self):
        """Test password contains at least one digit."""
        password = generate_random_password()
        assert any(c.isdigit() for c in password)
    
    def test_contains_special_char(self):
        """Test password contains at least one special character."""
        password = generate_random_password()
        special_chars = '!@#$%^&*'
        assert any(c in special_chars for c in password)
    
    def test_password_uniqueness(self):
        """Test that multiple calls generate different passwords."""
        passwords = [generate_random_password() for _ in range(100)]
        # All 100 passwords should be unique (extremely high probability)
        assert len(set(passwords)) == 100
    
    def test_no_whitespace(self):
        """Test password contains no whitespace characters."""
        password = generate_random_password()
        assert not any(c.isspace() for c in password)
    
    def test_allowed_characters_only(self):
        """Test password only contains allowed character types."""
        import string
        password = generate_random_password()
        allowed = string.ascii_letters + string.digits + '!@#$%^&*'
        assert all(c in allowed for c in password)
    
    def test_minimum_length_enforcement(self):
        """Test password meets minimum security requirements even at small lengths."""
        # Even with length 4 (minimum to have all char types), should work
        password = generate_random_password(length=4)
        assert len(password) == 4
        # Should still have variety
        assert any(c.isupper() for c in password)
        assert any(c.islower() for c in password)
        assert any(c.isdigit() for c in password)
        # Special char might not be present at length 4 due to guaranteed one of each


# ============================================================================
# Schema Tests
# ============================================================================

@pytest.mark.unit
class TestCSVSchemas:
    """Tests for Pydantic schemas in csv.py."""
    
    def test_csv_row_error_schema(self):
        """Test CSVRowError schema validation."""
        error = CSVRowError(
            row_number=5,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            error_message="Invalid email format"
        )
        
        assert error.row_number == 5
        assert error.error_message == "Invalid email format"
    
    def test_csv_upload_success_schema(self):
        """Test CSVUploadSuccess schema with defaults."""
        success = CSVUploadSuccess(
            message="Successfully added 10 users",
            total_rows=10,
            new_users_created=5,
            existing_users_added=5,
            users_already_in_event=0
        )
        
        assert success.success == True  # Default value
        assert success.total_rows == 10
    
    def test_csv_upload_failure_schema(self):
        """Test CSVUploadFailure schema with error list."""
        errors = [
            CSVRowError(
                row_number=2,
                first_name="",
                last_name="Doe",
                email="john@example.com",
                error_message="First name is required"
            )
        ]
        
        failure = CSVUploadFailure(
            message="CSV validation failed",
            total_rows=5,
            valid_rows=4,
            invalid_rows=1,
            errors=errors
        )
        
        assert failure.success == False  # Default value
        assert len(failure.errors) == 1
        assert failure.invalid_rows == 1


# ============================================================================
# Integration Tests: CSV Upload Endpoint
# ============================================================================

import requests
import io
from typing import List, Dict, Any
from uuid import uuid4
from datetime import datetime, timedelta, timezone

# Test server configuration
BASE_URL = "http://127.0.0.1"
LOGIN_URL = f"{BASE_URL}/auth/login"
CREATE_EVENT_URL = f"{BASE_URL}/protected/event/createEvent"
REMOVE_EVENT_URL = f"{BASE_URL}/protected/event/removeEvent"

# Test account credentials
TEST_EMAIL = "DONTREMOVE@example.com"
TEST_PASSWORD = "1231"


# ============================================================================
# Helper Functions for Integration Tests
# ============================================================================

def integration_login_and_get_token() -> str:
    """
    Login with DONTREMOVE account and return JWT token.
    
    Returns:
        JWT token string
    
    Raises:
        requests.HTTPError: If login fails
    """
    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
    }
    
    headers = {
        "accept": "application/json",
        "Content-Type": "application/json",
    }
    
    response = requests.post(LOGIN_URL, json=payload, headers=headers)
    response.raise_for_status()
    
    data = response.json()
    return data["token"]


def integration_create_event(token: str, event_name: str | None = None) -> int:
    """
    Create a test event and return its ID.
    
    Args:
        token: JWT authentication token
        event_name: Optional event name (generates unique name if not provided)
    
    Returns:
        Event ID
    """
    if event_name is None:
        # Generate unique event name with timestamp
        import time
        event_name = f"CSV Test {int(time.time() * 1000)}"
    
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    start = datetime.now(timezone.utc)
    end = start + timedelta(hours=2)
    
    payload = {
        "event_name": event_name,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "location": "Test Location",
    }
    
    response = requests.post(CREATE_EVENT_URL, json=payload, headers=headers)
    response.raise_for_status()
    
    data = response.json()
    return data["id"]


def integration_delete_event(token: str, event_id: int):
    """
    Delete an event by ID.
    
    Args:
        token: JWT authentication token
        event_id: Event ID to delete
    """
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    payload = {"event_id": event_id}
    
    response = requests.post(REMOVE_EVENT_URL, json=payload, headers=headers)
    # Don't raise on error - event might already be deleted
    if response.status_code != 200:
        print(f"Warning: Failed to delete event {event_id}: {response.text}")


def integration_delete_users_by_emails(token: str, emails: List[str]):
    """
    Delete users from database by email list.
    
    Args:
        token: JWT authentication token
        emails: List of email addresses to delete
    """
    # Note: This would require a delete user endpoint
    # For now, we'll skip cleanup of users as they'll accumulate in test DB
    # TODO: Implement when delete user endpoint is available
    pass


def integration_create_csv_bytes(content: str) -> bytes:
    """
    Convert CSV string content to bytes for upload.
    
    Args:
        content: CSV content as string
    
    Returns:
        CSV content as bytes
    """
    return content.encode('utf-8')


def integration_upload_csv(
    token: str,
    event_id: int,
    csv_content: str,
    filename: str = "test.csv"
) -> requests.Response:
    """
    Upload CSV file to event endpoint.
    
    Args:
        token: JWT authentication token
        event_id: Event ID to upload users to
        csv_content: CSV content as string
        filename: Filename for the upload
    
    Returns:
        Response object
    """
    url = f"{BASE_URL}/protected/event/{event_id}/uploadUserCSV"
    
    headers = {
        "Authorization": f"Bearer {token}",
    }
    
    csv_bytes = integration_create_csv_bytes(csv_content)
    files = {
        "csv_file": (filename, csv_bytes, "text/csv")
    }
    
    response = requests.post(url, headers=headers, files=files)
    return response


def integration_add_user_to_event(token: str, event_id: int, user_id: int):
    """
    Add a user to an event (create EventUser relationship).
    
    Args:
        token: JWT authentication token
        event_id: Event ID
        user_id: User ID to add
    """
    url = f"{BASE_URL}/protected/event/addEventUserRelationship"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "event_id": event_id,
        "user_id": user_id
    }
    
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()


def integration_get_event_users(token: str, event_id: int) -> List[Dict[str, Any]]:
    """
    Get all users in an event.
    
    Args:
        token: JWT authentication token
        event_id: Event ID
    
    Returns:
        List of user dictionaries
    """
    url = f"{BASE_URL}/protected/event/getUsers"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    
    payload = {"id": event_id}
    
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    
    return response.json()


# ============================================================================
# Integration Test Class
# ============================================================================

@pytest.mark.integration
@pytest.mark.event
class TestCSVUploadEndpoint:
    """
    Integration tests for CSV upload endpoint.
    
    Requirements:
    - Backend server must be running on http://127.0.0.1:80
    - DONTREMOVE@example.com account must exist with password: 1231
    
    These tests use real HTTP requests and the actual database.
    """
    
    @pytest.fixture(scope="class")
    def auth_token(self) -> str:
        """Get JWT token for test account (once per test class)."""
        return integration_login_and_get_token()
    
    @pytest.fixture(scope="function")
    def test_event_id(self, auth_token: str):
        """Create a test event for each test and clean up after."""
        event_id = integration_create_event(auth_token)
        yield event_id
        # Cleanup
        integration_delete_event(auth_token, event_id)
    
    # ========================================================================
    # Success Test Cases
    # ========================================================================
    
    def test_upload_csv_all_new_users(self, auth_token, test_event_id):
        """Test uploading CSV with all new users to system."""
        csv_content = create_valid_csv(5)
        
        response = integration_upload_csv(auth_token, test_event_id, csv_content)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["total_rows"] == 5
        assert data["new_users_created"] == 5
        assert data["existing_users_added"] == 0
        assert data["users_already_in_event"] == 0
        assert "Successfully added" in data["message"]
    
    def test_upload_csv_with_column_variations(self, auth_token, test_event_id):
        """Test CSV upload with various column name formats."""
        csv_content = "First Name,LAST_NAME,Email\nJohn,Doe,john.col@example.com\nJane,Smith,jane.col@example.com\n"
        
        response = integration_upload_csv(auth_token, test_event_id, csv_content)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["total_rows"] == 2
        assert data["new_users_created"] + data["existing_users_added"] == 2
    
    def test_upload_csv_with_extra_columns(self, auth_token, test_event_id):
        """Test that extra columns in CSV are ignored."""
        csv_content = "first_name,last_name,email,phone,address\nBob,Johnson,bob.extra@example.com,555-1234,123 Main St\n"
        
        response = integration_upload_csv(auth_token, test_event_id, csv_content)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["total_rows"] == 1
    
    def test_upload_csv_whitespace_trimming(self, auth_token, test_event_id):
        """Test that whitespace in fields is properly trimmed."""
        csv_content = "first_name,last_name,email\n  Alice  ,  Wonder  ,  alice.space@example.com  \n"
        
        response = integration_upload_csv(auth_token, test_event_id, csv_content)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["total_rows"] == 1
    
    def test_upload_csv_medium_batch(self, auth_token, test_event_id):
        """Test uploading medium batch of 50 users."""
        csv_content = create_valid_csv(50)
        
        response = integration_upload_csv(auth_token, test_event_id, csv_content)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["total_rows"] == 50
        assert data["new_users_created"] + data["existing_users_added"] == 50
    
    # def test_upload_csv_maximum_allowed(self, auth_token, test_event_id):
    #     """Test uploading exactly 500 users (maximum allowed)."""
    #     csv_content = create_valid_csv(500)
        
    #     response = integration_upload_csv(auth_token, test_event_id, csv_content)
        
    #     assert response.status_code == 200
    #     data = response.json()
    #     assert data["success"] == True
    #     assert data["total_rows"] == 500
    
    def test_upload_csv_empty_file(self, auth_token, test_event_id):
        """Test uploading CSV with only headers (no data rows)."""
        csv_content = "first_name,last_name,email\n"
        
        response = integration_upload_csv(auth_token, test_event_id, csv_content)
        
        # Should succeed but with 0 rows
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["total_rows"] == 0
        assert data["new_users_created"] == 0
    
    # ========================================================================
    # Validation Error Test Cases
    # ========================================================================
    
    def test_upload_csv_validation_errors(self, auth_token, test_event_id):
        """Test CSV with mix of valid and invalid rows."""
        csv_content = """first_name,last_name,email
John,Doe,john.valid@example.com
,Smith,missing.first@example.com
Bob,,missing.last@example.com
Alice,Wonder,not-an-email
Charlie,Brown,charlie.valid@example.com
"""
        response = integration_upload_csv(auth_token, test_event_id, csv_content)
        
        # Should return validation errors, no users added
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["total_rows"] == 5
        assert data["valid_rows"] == 2
        assert data["invalid_rows"] == 3
        assert len(data["errors"]) == 3
        assert "validation failed" in data["message"].lower()
    
    def test_upload_csv_duplicate_emails(self, auth_token, test_event_id):
        """Test CSV with duplicate emails within the file."""
        csv_content = create_csv_with_errors('duplicate_email')
        
        response = integration_upload_csv(auth_token, test_event_id, csv_content)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["invalid_rows"] >= 1
        assert any("duplicate" in err["error_message"].lower() for err in data["errors"])
    
    def test_upload_csv_invalid_emails(self, auth_token, test_event_id):
        """Test CSV with various invalid email formats."""
        csv_content = """first_name,last_name,email
User1,Test,not-an-email
User2,Test,user@
User3,Test,@example.com
User4,Test,user @space.com
User5,Test,user@@double.com
User6,Test,
"""
        response = integration_upload_csv(auth_token, test_event_id, csv_content)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["invalid_rows"] == 6
        assert len(data["errors"]) == 6
    
    def test_upload_csv_missing_required_column(self, auth_token, test_event_id):
        """Test CSV missing required email column."""
        csv_content = "first_name,last_name\nJohn,Doe\n"
        
        response = integration_upload_csv(auth_token, test_event_id, csv_content)
        
        assert response.status_code == 400
        data = response.json()
        assert "missing require columns" in data["detail"].lower()
    
    def test_upload_csv_exceeds_row_limit(self, auth_token, test_event_id):
        """Test CSV with more than 500 rows (exceeds limit)."""
        csv_content = create_valid_csv(501)
        
        response = integration_upload_csv(auth_token, test_event_id, csv_content)
        
        assert response.status_code == 400
        data = response.json()
        assert "exceeds maximum row limit" in data["detail"].lower()
    
    def test_upload_csv_all_rows_invalid(self, auth_token, test_event_id):
        """Test CSV where all rows have validation errors."""
        csv_content = """first_name,last_name,email
,Doe,john@example.com
Jane,,jane@example.com
Bob,Smith,not-an-email
"""
        response = integration_upload_csv(auth_token, test_event_id, csv_content)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["valid_rows"] == 0
        assert data["invalid_rows"] == 3
    
    # ========================================================================
    # File Validation Test Cases
    # ========================================================================
    
    def test_upload_invalid_file_type(self, auth_token, test_event_id):
        """Test uploading non-CSV file (should reject)."""
        csv_content = "first_name,last_name,email\nJohn,Doe,john@example.com\n"
        
        response = integration_upload_csv(
            auth_token,
            test_event_id,
            csv_content,
            filename="test.txt"  # Wrong extension
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "invalid file type" in data["detail"].lower()
    
    def test_upload_csv_no_file_provided(self, auth_token, test_event_id):
        """Test endpoint with no file provided."""
        url = f"{BASE_URL}/protected/events/{test_event_id}/uploadUserCSV"
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Send request without files parameter
        response = requests.post(url, headers=headers)
        
        assert response.status_code == 422  # Validation error
    
    def test_upload_csv_file_too_large(self, auth_token, test_event_id):
        """Test uploading file larger than 20MB limit."""
        # Create a CSV content larger than 20MB
        large_content = "first_name,last_name,email\n"
        large_content += "a" * (21 * 1024 * 1024)  # 21MB of data
        
        response = integration_upload_csv(auth_token, test_event_id, large_content)
        
        assert response.status_code == 400
        data = response.json()
        assert "exceeds maximum limit" in data["detail"].lower()
    
    # ========================================================================
    # Authorization Test Cases
    # ========================================================================
    
    def test_upload_csv_no_authentication(self, test_event_id):
        """Test uploading CSV without authentication token."""
        csv_content = create_valid_csv(3)
        url = f"{BASE_URL}/protected/event/{test_event_id}/uploadUserCSV"
        
        csv_bytes = integration_create_csv_bytes(csv_content)
        files = {"csv_file": ("test.csv", csv_bytes, "text/csv")}
        
        # No Authorization header
        response = requests.post(url, files=files)
        
        assert response.status_code == 401
    
    def test_upload_csv_invalid_token(self, test_event_id):
        """Test uploading CSV with invalid JWT token."""
        csv_content = create_valid_csv(3)
        url = f"{BASE_URL}/protected/event/{test_event_id}/uploadUserCSV"
        
        headers = {"Authorization": "Bearer invalid-token-12345"}
        csv_bytes = integration_create_csv_bytes(csv_content)
        files = {"csv_file": ("test.csv", csv_bytes, "text/csv")}
        
        response = requests.post(url, headers=headers, files=files)
        
        assert response.status_code == 401
    
    def test_upload_csv_event_not_found(self, auth_token):
        """Test uploading CSV to non-existent event."""
        csv_content = create_valid_csv(3)
        non_existent_event_id = 999999
        
        response = integration_upload_csv(
            auth_token,
            non_existent_event_id,
            csv_content
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "event" in data["detail"].lower()
        assert "not exist" in data["detail"].lower() or "not found" in data["detail"].lower()
    
    def test_upload_csv_case_insensitive_extension(self, auth_token, test_event_id):
        """Test that .CSV (uppercase) extension is accepted."""
        csv_content = create_valid_csv(2)
        
        response = integration_upload_csv(
            auth_token,
            test_event_id,
            csv_content,
            filename="test.CSV"  # Uppercase extension
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
