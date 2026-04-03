import random

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.db.repository.breakout_room import BreakoutRoomRepository
from app.db.models.session import Session as SessionModel
from app.db.models.attendance import Attendance, AttendanceStatus
from app.db.models.user import User


class BreakoutService:
    def __init__(self, session: Session):
        self.__repo = BreakoutRoomRepository(session=session)
        self.session = session

    def get_assignments(self, event_id: int) -> list[dict]:
        return self.__repo.get_assignments(event_id)

    def get_users_in_session(self, event_id: int) -> list[dict]:
        """
        Return users checked into the latest session for an event.
        Raises 404 if no session exists, 400 if the session has not been started.
        """
        latest = (
            self.session.query(SessionModel)
            .filter(SessionModel.event_id == event_id)
            .order_by(SessionModel.sequence_number.desc())
            .first()
        )
        if latest is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No session found for this event.",
            )
        if latest.start_time is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session has not been started yet.",
            )

        rows = (
            self.session.query(
                Attendance.user_id,
                User.first_name,
                User.last_name,
                User.email,
                Attendance.status,
            )
            .join(User, User.id == Attendance.user_id)
            .filter(
                Attendance.session_id == latest.id,
                Attendance.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
            )
            .all()
        )
        return [
            {
                "user_id": r.user_id,
                "first_name": r.first_name,
                "last_name": r.last_name,
                "email": r.email,
                "status": r.status.value,
            }
            for r in rows
        ]

    def auto_assign(self, event_id: int, num_rooms: int, user_ids: list[int]) -> None:
        """Randomly and evenly distribute user_ids across num_rooms rooms."""
        if num_rooms < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="num_rooms must be at least 1.",
            )
        if not user_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No users provided for auto-assign.",
            )

        shuffled = list(user_ids)
        random.shuffle(shuffled)

        for i, user_id in enumerate(shuffled):
            room_number = (i % num_rooms) + 1
            self.__repo.upsert_user(event_id, user_id, room_number)

    def push_users(self, event_id: int, room_number: int, user_ids: list[int]) -> None:
        """Assign a list of users to a specific room."""
        for user_id in user_ids:
            self.__repo.upsert_user(event_id, user_id, room_number)

    def remove_user(self, event_id: int, user_id: int) -> None:
        removed = self.__repo.remove_user(event_id, user_id)
        if not removed:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User is not assigned to any breakout room.",
            )

    def end_rooms(self, event_id: int) -> int:
        return self.__repo.end_all(event_id)

    def get_my_room(self, event_id: int, user_id: int) -> dict:
        """Return the user's room and roommates, or room_number=None if unassigned."""
        result = self.__repo.get_user_room(event_id, user_id)
        if result is None:
            return {"room_number": None, "members": []}
        return result

    def get_latest_session_id(self, event_id: int) -> int | None:
        """Return the id of the latest session for an event, or None."""
        row = (
            self.session.query(SessionModel)
            .filter(SessionModel.event_id == event_id)
            .order_by(SessionModel.sequence_number.desc())
            .first()
        )
        return row.id if row else None
