from sqlalchemy.orm import Session

from app.db.repository.attendance import AttendanceRepository
from app.db.models.attendance import Attendance
# from app.schemas.attendance import user_in_attendance  # if you later want Pydantic in/out


class AttendanceService:
    def __init__(self, session: Session):
        self.__repo = AttendanceRepository(session=session)

    def add_users_for_session(self, session_id: int) -> list[Attendance]:
        return self.__repo.add_users(session_id)
