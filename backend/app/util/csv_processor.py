import csv, secrets, string, re, random
from io import StringIO
from typing import List,Dict, Tuple
from fastapi import UploadFile, HTTPException
from pydantic import EmailStr, ValidationError, BaseModel
from app.db.schema.user import EmailValidator

async def validate_csv_file(upload_file:UploadFile) -> None: 
    """Validate CSV file type and size. Raise HTTPexcept on failure."""
    if not upload_file.filename.lower().endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only .csv files are accepted."
        )
    
    # check file size (read first 20MB + 1 byte to detect overflow)
    MAX_SIZE = 20 * 1024 * 1024
    content = await upload_file.read()

    if len(content) > MAX_SIZE: 
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum limit of 20MB"
        )
    
    await upload_file.seek(0)


def normalize_column_name(col:str) -> str:
    """
    Normalize column name to lowercase and replace spaces/underscores.
    Examples: 'First Name' -> 'first_name', 'Email' -> 'email'
    """
    return col.strip().lower().replace(' ', '_').replace('-', '_')



def validate_email_format(email:str) -> bool:
    """Validate Email format using Pydantic's EmailStr."""
    try:
        EmailValidator(email=email)
        return True
    except ValidationError:
        return False
    

async def parse_and_validate_csv(
        csv_file: UploadFile,
        max_rows: int = 500
) -> Tuple[List[Dict[str,str]], List[Dict[str,str]]]:
    """
    Parse and validate CSV file.
    
    Returns:
        Tuple of (valid_rows, error_rows)
        - valid_rows: List of validated user dicts with normalized data
        - error_rows: List of error dicts with row details and error messages
    
    Validation checks:
    - Required columns: first_name, last_name, email
    - Max rows: 500
    - All required fields non-empty
    - Valid email format (using Pydantic EmailStr)
    - No duplicate emails within CSV
    """
    content = await csv_file.read()
    decoded_content = content.decode('utf-8')
    await csv_file.seek(0)
    csv_reader = csv.DictReader(StringIO(decoded_content))

    if csv_reader.fieldnames:
        csv_reader.fieldnames = [normalize_column_name(col) for col in csv_reader.fieldnames]

    required_columns = {'first_name', 'last_name', 'email'}
    if not required_columns.issubset(set(csv_reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"CSV missing require columns. Require: {', '.join(required_columns)}"
        )

    valid_rows= []
    error_rows = []
    email_tracker = {}
    row_count = 0

    for row in csv_reader:
        row_count += 1
        row_number = row_count + 1

        #check max rows limit
        if row_count > max_rows:
            raise HTTPException(
                status_code=400, 
                detail=f"CSV exceeds maximum row limit of {max_rows} rows"
            )
        
        first_name = row.get('first_name', '').strip()
        last_name = row.get('last_name', '').strip()
        email = row.get('email', '').strip()

        #validate require field are non-empty
        if not first_name:
            error_rows.append({
                'row_number': row_number,
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'error_message': 'First name is required'
            })
            continue
        
        if not last_name:
            error_rows.append({
                'row_number': row_number,
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'error_message': 'Last name is required'
            })
            continue
        
        if not email:
            error_rows.append({
                'row_number': row_number,
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'error_message': 'Email is required'
            })
            continue

        #validate email format
        if not validate_email_format(email):
            error_rows.append({
                'row_number': row_number,
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'error_message': 'Invalid email format'
            })
            continue

        # Check for duplicate email within CSV
        email_lower = email.lower()
        if email_lower in email_tracker:
            error_rows.append({
                'row_number': row_number,
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'error_message': f'Duplicate email found in CSV (also appears in row {email_tracker[email_lower]})'
            })
            continue
        
        # Track email
        email_tracker[email_lower] = row_number
        
        # Add to valid rows
        valid_rows.append({
            'first_name': first_name,
            'last_name': last_name,
            'email': email
        })

    return valid_rows, error_rows
    

def generate_random_password(length: int=14) -> str:
    """Generate cryptographically secure random password."""
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    special = '!@#$%^&*'

    password = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(special)
    ]

    all_chars = uppercase + lowercase + digits + special
    password.extend(secrets.choice(all_chars) for _ in range(length - 4))

    #shuffle
    random.SystemRandom().shuffle(password)

    return ''.join(password)

