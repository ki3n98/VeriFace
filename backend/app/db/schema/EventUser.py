from pydantic import BaseModel
from typing import Union

class EventUserCreate(BaseModel):
    user_id:int
    event_id: int

class EventUserRemove(BaseModel):
    user_id:int
    event_id: int