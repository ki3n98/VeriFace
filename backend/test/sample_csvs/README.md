# Sample CSV Files for Testing

This directory contains various CSV files to test the CSV upload functionality of VeriFace.

## Test Files Overview

### ✅ Valid CSV Files (Should Succeed)

#### 1. `valid_users.csv`
- **Rows:** 10 valid users
- **Purpose:** Test successful upload with all valid data
- **Expected Result:** Success - All 10 users added
- **Use Case:** Basic functionality test

#### 2. `column_variations.csv`
- **Rows:** 3 users
- **Column Format:** "First Name", "Last Name", "Email" (with spaces)
- **Purpose:** Test column name normalization
- **Expected Result:** Success - All 3 users added
- **Use Case:** Verify case-insensitive, space-tolerant column matching

#### 3. `uppercase_columns.csv`
- **Rows:** 3 users
- **Column Format:** "FIRST_NAME", "LAST_NAME", "EMAIL" (uppercase)
- **Purpose:** Test uppercase column names
- **Expected Result:** Success - All 3 users added
- **Use Case:** Verify column name normalization handles uppercase

#### 4. `extra_columns.csv`
- **Rows:** 3 users
- **Columns:** first_name, last_name, email, phone, address, city, state, zip
- **Purpose:** Test that extra columns are ignored
- **Expected Result:** Success - All 3 users added, extra columns ignored
- **Use Case:** Real-world CSV files often have extra data

#### 5. `whitespace.csv`
- **Rows:** 3 users
- **Purpose:** Test whitespace trimming in fields
- **Expected Result:** Success - All 3 users added with trimmed values
- **Use Case:** CSV exports often have extra whitespace

#### 6. `medium_50_users.csv`
- **Rows:** 50 users
- **Purpose:** Test moderate-sized batch upload
- **Expected Result:** Success - All 50 users added
- **Use Case:** Typical batch upload size

#### 7. `large_500_users.csv`
- **Rows:** 500 users (EXACTLY at limit)
- **Purpose:** Test maximum allowed rows
- **Expected Result:** Success - All 500 users added
- **Use Case:** Boundary condition testing

---

### ❌ Invalid CSV Files (Should Fail with Errors)

#### 8. `mixed_users.csv`
- **Rows:** 10 total (4 valid, 6 invalid)
- **Errors:**
  - Row 3: Missing first_name
  - Row 4: Missing last_name
  - Row 5: Invalid email format
  - Row 8: Missing last_name
  - Row 9: Missing first_name
  - Row 10: Invalid email format
- **Expected Result:** Failure - 4 valid, 6 errors reported
- **Use Case:** Partial validation failure

#### 9. `duplicate_emails.csv`
- **Rows:** 6 total (3 valid, 3 duplicates)
- **Errors:**
  - Row 4: Duplicate of john@example.com (row 2)
  - Row 5: Duplicate of jane@example.com (row 3, case-insensitive)
  - Row 6: Duplicate of charlie@example.com (row 5, case-insensitive)
- **Expected Result:** Failure - 3 valid, 3 duplicate errors
- **Use Case:** Duplicate email detection (case-insensitive)

#### 10. `empty_fields.csv`
- **Rows:** 5 total (2 valid, 3 invalid)
- **Errors:**
  - Row 3: Missing first_name
  - Row 4: Missing last_name
  - Row 5: Missing email
- **Expected Result:** Failure - 2 valid, 3 errors
- **Use Case:** Required field validation

#### 11. `invalid_emails.csv`
- **Rows:** 7 total (1 valid, 6 invalid)
- **Errors:**
  - Row 3: "not-an-email" (missing @)
  - Row 4: "@example.com" (missing username)
  - Row 5: "alice@" (missing domain)
  - Row 6: "alice@@example.com" (double @)
  - Row 7: "david lee@example.com" (space in email)
  - Row 8: "eve@example" (incomplete domain)
- **Expected Result:** Failure - 1 valid, 6 email format errors
- **Use Case:** Email validation testing

#### 12. `large_501_users.csv`
- **Rows:** 501 users (EXCEEDS limit by 1)
- **Purpose:** Test row limit enforcement
- **Expected Result:** HTTP 400 Error - "CSV exceeds maximum row limit of 500 rows"
- **Use Case:** Boundary condition - reject files over limit

#### 13. `test.txt`
- **File Type:** .txt (not .csv)
- **Purpose:** Test file type validation
- **Expected Result:** HTTP 400 Error - "Invalid file type. Only .csv files are accepted."
- **Use Case:** File extension validation

---

## Testing Instructions

### Using cURL

```bash
# Test valid upload
curl -X POST "http://localhost:80/protected/events/{event_id}/uploadUserCSV" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "csv_file=@test/sample_csvs/valid_users.csv"

# Test invalid file type
curl -X POST "http://localhost:80/protected/events/{event_id}/uploadUserCSV" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "csv_file=@test/sample_csvs/test.txt"

# Test over limit
curl -X POST "http://localhost:80/protected/events/{event_id}/uploadUserCSV" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "csv_file=@test/sample_csvs/large_501_users.csv"
```

### Using Python

```python
import requests

BASE_URL = "http://localhost:80"
TOKEN = "YOUR_JWT_TOKEN"
EVENT_ID = 1  # Replace with actual event ID

headers = {"Authorization": f"Bearer {TOKEN}"}

# Test valid upload
with open("test/sample_csvs/valid_users.csv", "rb") as f:
    files = {"csv_file": f}
    response = requests.post(
        f"{BASE_URL}/protected/events/{EVENT_ID}/uploadUserCSV",
        headers=headers,
        files=files
    )
    print("Valid Users Response:", response.json())

# Test mixed valid/invalid
with open("test/sample_csvs/mixed_users.csv", "rb") as f:
    files = {"csv_file": f}
    response = requests.post(
        f"{BASE_URL}/protected/events/{EVENT_ID}/uploadUserCSV",
        headers=headers,
        files=files
    )
    print("Mixed Users Response:", response.json())
```

### Using Postman

1. Create new POST request
2. URL: `http://localhost:80/protected/events/{event_id}/uploadUserCSV`
3. Headers:
   - `Authorization: Bearer YOUR_JWT_TOKEN`
4. Body:
   - Type: `form-data`
   - Key: `csv_file` (type: File)
   - Value: Select CSV file

---

## Expected Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Successfully added 10 users to event 'Tech Conference 2024'",
  "total_rows": 10,
  "new_users_created": 5,
  "existing_users_added": 5,
  "users_already_in_event": 0
}
```

### Failure Response (Validation Errors)
```json
{
  "success": false,
  "message": "CSV validation failed. No users were added to the event.",
  "total_rows": 10,
  "valid_rows": 4,
  "invalid_rows": 6,
  "errors": [
    {
      "row_number": 3,
      "first_name": "",
      "last_name": "Smith",
      "email": "missing.first@example.com",
      "error_message": "First name is required"
    },
    {
      "row_number": 5,
      "first_name": "Bob",
      "last_name": "Builder",
      "email": "invalid-email",
      "error_message": "Invalid email format"
    }
  ]
}
```

---

## Quick Test Checklist

Use this checklist to verify all functionality:

- [ ] **Valid upload works** - `valid_users.csv`
- [ ] **Column normalization** - `column_variations.csv`, `uppercase_columns.csv`
- [ ] **Extra columns ignored** - `extra_columns.csv`
- [ ] **Whitespace trimmed** - `whitespace.csv`
- [ ] **Medium batch works** - `medium_50_users.csv`
- [ ] **Max limit works** - `large_500_users.csv`
- [ ] **Mixed errors reported** - `mixed_users.csv`
- [ ] **Duplicates detected** - `duplicate_emails.csv`
- [ ] **Empty fields caught** - `empty_fields.csv`
- [ ] **Invalid emails caught** - `invalid_emails.csv`
- [ ] **Over limit rejected** - `large_501_users.csv`
- [ ] **Wrong file type rejected** - `test.txt`

---

## Regenerating Large CSV Files

If you need to regenerate the large CSV files:

```bash
cd test/sample_csvs
python generate_large_csv.py
```

This will create:
- `large_500_users.csv` (500 rows - max allowed)
- `large_501_users.csv` (501 rows - exceeds limit)
- `medium_50_users.csv` (50 rows - moderate size)

---

## Notes

- All test files use `example.com` or `test.com` domains
- Email addresses are fictional and for testing only
- Files are intentionally small (except large test files) for quick testing
- All files use UTF-8 encoding
- All files use standard CSV format (comma-delimited)
- Line endings are Unix-style (`\n`)

---

## Adding Your Own Test Files

To create custom test files:

1. Create a new `.csv` file in this directory
2. Ensure it has required columns: `first_name`, `last_name`, `email`
3. Add test data as needed
4. Update this README with the new file description

### Template for New Test File

```csv
first_name,last_name,email
John,Doe,john@example.com
Jane,Smith,jane@example.com
```

---

**Last Updated:** January 26, 2026
**Created By:** VeriFace Development Team
