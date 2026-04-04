from pydantic import BaseModel, EmailStr
from typing import Literal, Union

class EventUserCreate(BaseModel):
    user_id:int
    event_id: int
    role: Literal["owner", "admin", "moderator", "viewer", "member"] = "member"

class EventUserRemove(BaseModel):
    user_id:int
    event_id: int

class MemberAddRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr


class MemberRemoveRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr


class RoleUpdateRequest(BaseModel):
    user_id: int
    role: Literal["admin", "moderator", "viewer", "member"]


class MemberWithRole(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    role: str
