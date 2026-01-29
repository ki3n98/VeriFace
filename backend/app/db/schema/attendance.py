from pydantic import BaseModel
from typing import Union
from datetime import datetime
from app.db.models.attendance import AttendanceStatus

class UserInAttendance(BaseModel):
    user_id: int
    session_id: int
    check_in_time : Union[datetime, None] = None
    check_out_time : Union[datetime, None] = None
    status: AttendanceStatus = AttendanceStatus.ABSENT

