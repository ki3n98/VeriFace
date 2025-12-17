from sqlalchemy import (
    Column, Integer, DateTime, Enum, ForeignKey, String, UniqueConstraint
)
from app.core.database import Base
import enum

class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    LATE = "late"
    ABSENT = "absent"
    EXCUSED = "excused"

class Attendance(Base):
    __tablename__ = "Attendance"
    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("Users.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("Sessions.id"), nullable=False)

    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)

    status = Column(Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.PRESENT)


    __table_args__ = (
        UniqueConstraint("user_id", "session_id", name="uq_user_session_attendance"),
    )
