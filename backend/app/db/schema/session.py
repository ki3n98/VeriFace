from pydantic import BaseModel, ConfigDict
from typing import Union
from datetime import datetime


class SessionInCreate(BaseModel):
    event_id:int
    sequence_number: Union[int, None] = None
    start_time: Union[datetime, None] = None
    end_time : Union[datetime, None] = None
    location : Union[str, None] = None
