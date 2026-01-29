from pydantic import BaseModel, EmailStr
from typing import Union

class EventUserCreate(BaseModel):
    user_id:int
    event_id: int

class EventUserRemove(BaseModel):
    user_id:int
    event_id: int

class MemberAddRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr