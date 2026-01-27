from pydantic import BaseModel, EmailStr
from typing import List, Union
from .user import UserOutput
from typing import Union

class CSVRowError(BaseModel):
    """Error for a failed CSV row"""
    row_number: int
    first_name: str
    last_name: str
    email: str
    error_message: str


class CSVUploadSuccess(BaseModel):
    """Response for successful CSV upload"""
    success: bool = True
    message: str
    total_rows: int
    new_users_created: int
    existing_users_added: int
    users_already_in_event: int


class CSVUploadFailure(BaseModel):
    """Response for failed CSV upload (validation errors)"""
    success: bool = False
    message: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    errors: List[CSVRowError]


