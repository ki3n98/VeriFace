from pydantic import BaseModel, ConfigDict, field_serializer
from typing import Union
from datetime import datetime

from app.util.datetime_json import session_instant_to_utc_iso_z


class SessionInCreate(BaseModel):
    event_id:int
    sequence_number: Union[int, None] = None
    start_time: Union[datetime, None] = None
    end_time : Union[datetime, None] = None
    location : Union[str, None] = None


class SessionOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    sequence_number: int
    start_time: Union[datetime, None] = None
    end_time: Union[datetime, None] = None

    @field_serializer("start_time", "end_time")
    def _serialize_session_times(self, v: datetime | None) -> str | None:
        return session_instant_to_utc_iso_z(v)

