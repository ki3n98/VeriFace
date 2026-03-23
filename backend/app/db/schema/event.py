from pydantic import BaseModel, ConfigDict
from typing import List, Union
from datetime import datetime, time

class EventInCreate(BaseModel):
    event_name: str
    user_id: Union[int, None] = None
    start_date: Union[datetime, None] = None
    end_date: Union[datetime, None] = None
    location: Union[str, None] = None
    default_start_time: Union[time, None] = None


class EventInUpdate(BaseModel):
    id: int
    event_name: Union[str, None] = None
    user_id: Union[int, None] = None
    start_date: Union[datetime, None] = None
    end_date: Union[datetime, None] = None
    location: Union[str, None] = None
    default_start_time: Union[time, None] = None


class EventOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_name: str
    user_id: int
    start_date: Union[datetime, None] = None
    end_date: Union[datetime, None] = None
    location: Union[str, None] = None
    default_start_time: Union[time, None] = None


class UpdateDefaultStartTimeRequest(BaseModel):
    event_id: int
    default_start_time: Union[str, None] = None  # "14:30" or "14:30:00"


class EventToRemove(BaseModel):
    user_id: Union[int, None] = None
    event_id: int


class EventId(BaseModel):
    id:int


class EventWithRole(EventOutput):
    role: str


class InviteEmailResponse(BaseModel):
    success: bool
    message: str
    sent_count: int
    failed_count: int
    failed_emails: List[str] = []