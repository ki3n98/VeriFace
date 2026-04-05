from pydantic import BaseModel, field_serializer
from typing import Union
from datetime import datetime
from app.db.models.attendance import AttendanceStatus
from app.util.datetime_json import utc_iso_z


class UpdateAttendanceStatusRequest(BaseModel):
    user_id: int
    session_id: int
    status: str  # "present", "late", "absent"


class UserInAttendance(BaseModel):
    user_id: int
    session_id: int
    check_in_time : Union[datetime, None] = None
    check_out_time : Union[datetime, None] = None
    status: AttendanceStatus = AttendanceStatus.ABSENT


class AttendanceWithUser(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: str
    status: AttendanceStatus
    check_in_time: Union[datetime, None] = None

    @field_serializer("check_in_time")
    def _serialize_check_in_time(self, v: datetime | None) -> str | None:
        return utc_iso_z(v)

