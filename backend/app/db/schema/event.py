from pydantic import BaseModel, ConfigDict
from typing import List, Union
from datetime import datetime

"""
    __tablename__ = "Events"
    id = Column(Integer, primary_key=True) 

    user_ids = Column(ForeignKey("Users.id"))
    event_name = Column(String(250))
    start_date = Column(DateTime, nullable = False)
    end_date = Column(DateTime, nullable = False)
    location = Column(String(250), nullable = False)
"""
class EventInCreate(BaseModel):
    event_name: str
    user_id: Union[int, None] = None
    start_date: Union[datetime, None] = None
    end_date: Union[datetime, None] = None
    location: Union[str, None] = None


class EventInUpdate(BaseModel):
    id: int
    event_name: Union[str, None] = None
    user_id: Union[int, None] = None
    start_date: Union[datetime, None] = None
    end_date: Union[datetime, None] = None
    location: Union[str, None] = None



class EventOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_name: str
    user_id: int
    start_date: Union[datetime, None] = None
    end_date: Union[datetime, None] = None
    location: Union[str, None] = None


class EventToRemove(BaseModel):
    user_id: Union[int, None] = None
    event_id: int


class EventId(BaseModel):
    id:int


class InviteEmailResponse(BaseModel):
    success: bool
    message: str
    sent_count: int
    failed_count: int
    failed_emails: List[str] = []