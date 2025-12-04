from pydantic import BaseModel
from typing import Union, List
from datetime import datetime

class EventInCreate(BaseModel):
    event_name: str
    start_date: datetime
    end_date: datetime
    location: str
    users: Union[List[str], None] = None


class EventOutput(BaseModel):
    event_name: str
    start_date: datetime
    end_date: datetime
    location: str
    users: Union[List[str], None] = None

    class Config:
        orm_mode = True


class EventInUpdate(BaseModel):
    event_name: Union[str, None] = None
    start_date: Union[datetime, None] = None
    end_date: Union[datetime, None] = None
    location: Union[str, None] = None
    users: Union[List[str], None] = None


