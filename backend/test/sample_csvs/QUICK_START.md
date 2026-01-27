# Quick Start - CSV Upload Testing

## 📁 Available Test Files

### ✅ Success Cases (Should Work)
| File | Rows | Test Purpose |
|------|------|--------------|
| `valid_users.csv` | 10 | Basic valid upload |
| `column_variations.csv` | 3 | Column names with spaces |
| `uppercase_columns.csv` | 3 | UPPERCASE column names |
| `extra_columns.csv` | 3 | Extra columns ignored |
| `whitespace.csv` | 3 | Whitespace trimming |
| `medium_50_users.csv` | 50 | Medium batch |
| `large_500_users.csv` | 500 | Maximum allowed (500) |

### ❌ Error Cases (Should Fail)
| File | Expected Error |
|------|----------------|
| `mixed_users.csv` | 6 validation errors (missing fields, invalid emails) |
| `duplicate_emails.csv` | 3 duplicate email errors |
| `empty_fields.csv` | 3 empty field errors |
| `invalid_emails.csv` | 6 invalid email format errors |
| `large_501_users.csv` | Row limit exceeded (501 rows) |
| `test.txt` | Invalid file type (.txt) |

## 🚀 Quick Test Commands

### Test with cURL
```bash
# Replace these values
EVENT_ID=1
TOKEN="your-jwt-token-here"

# Test valid upload
curl -X POST "http://localhost:80/protected/events/${EVENT_ID}/uploadUserCSV" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "csv_file=@test/sample_csvs/valid_users.csv"

# Test error handling
curl -X POST "http://localhost:80/protected/events/${EVENT_ID}/uploadUserCSV" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "csv_file=@test/sample_csvs/mixed_users.csv"
```

### Test with Python
```python
import requests

# Configuration
BASE_URL = "http://localhost:80"
EVENT_ID = 1  # Change to your event ID
TOKEN = "your-jwt-token-here"  # Get from login

headers = {"Authorization": f"Bearer {TOKEN}"}

# Test valid upload
with open("test/sample_csvs/valid_users.csv", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/protected/events/{EVENT_ID}/uploadUserCSV",
        headers=headers,
        files={"csv_file": f}
    )
    print("✅ Valid Upload:", response.json())

# Test error handling
with open("test/sample_csvs/mixed_users.csv", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/protected/events/{EVENT_ID}/uploadUserCSV",
        headers=headers,
        files={"csv_file": f}
    )
    print("❌ Mixed Upload:", response.json())
```

## 📋 Expected Responses

### Success Response
```json
{
  "success": true,
  "message": "Successfully added 10 users to event 'Event Name'",
  "total_rows": 10,
  "new_users_created": 8,
  "existing_users_added": 2,
  "users_already_in_event": 0
}
```

### Error Response
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
      "email": "missing@example.com",
      "error_message": "First name is required"
    }
  ]
}
```

## 🔑 Getting Your JWT Token

### Option 1: Login via API
```bash
curl -X POST "http://localhost:80/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "DONTREMOVE@example.com",
    "password": "1231"
  }'
```

Response contains `"token": "your-jwt-token"`

### Option 2: Python Script
```python
import requests

response = requests.post(
    "http://localhost:80/auth/login",
    json={
        "email": "your-email@example.com",
        "password": "your-password"
    }
)

token = response.json()["token"]
print(f"Token: {token}")
```

## 📊 Testing Checklist

Use this to verify all functionality works:

- [ ] Valid upload succeeds (`valid_users.csv`)
- [ ] Column variations work (`column_variations.csv`, `uppercase_columns.csv`)
- [ ] Extra columns ignored (`extra_columns.csv`)
- [ ] Whitespace trimmed (`whitespace.csv`)
- [ ] Medium batch works (`medium_50_users.csv`)
- [ ] Max limit accepted (`large_500_users.csv`)
- [ ] Mixed errors reported (`mixed_users.csv`)
- [ ] Duplicates detected (`duplicate_emails.csv`)
- [ ] Empty fields caught (`empty_fields.csv`)
- [ ] Invalid emails caught (`invalid_emails.csv`)
- [ ] Over limit rejected (`large_501_users.csv`)
- [ ] Wrong file type rejected (`test.txt`)

## 🐛 Common Issues

### "Unauthorized" Error
- Check JWT token is valid (login again if expired)
- Ensure `Authorization: Bearer TOKEN` header is set

### "No permission" Error
- User must be event owner or have permission to manage event
- Check `event_id` is correct

### "Event not found" Error
- Verify event exists in database
- Check `event_id` parameter

### File Not Found
- Ensure you're running commands from `/backend` directory
- Use full path: `test/sample_csvs/filename.csv`

## 📝 CSV Format Requirements

Your CSV must have these columns (case-insensitive):
- `first_name` (required, non-empty)
- `last_name` (required, non-empty)
- `email` (required, valid email format)

### Valid Column Name Variations
All these work due to normalization:
- `first_name`, `First Name`, `FIRST_NAME`, `First-Name`
- `last_name`, `Last Name`, `LAST_NAME`, `Last-Name`
- `email`, `Email`, `EMAIL`, `E-mail`

## 🔗 More Info

See `README.md` for detailed documentation on each test file.
