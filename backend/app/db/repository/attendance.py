from sqlalchemy import select
from sqlalchemy.orm import Session
from .base import BaseRepository
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.db.models.attendance import Attendance, AttendanceStatus
from app.db.models.session import Session as SessionModel
from app.db.models.event_user import EventUser


class AttendanceRepository(BaseRepository):

    def add_users(self, session_id: int):
        """
        For a given session_id:
        - find the event_id for that session
        - find all users that belong to that event
        - create Attendance rows (if not already present) for those users
        """
        #Get event_id from Sessions
        event_id = (
            self.session
            .query(SessionModel.event_id)
            .filter(SessionModel.id == session_id)
            .scalar()
        )


        if event_id is None:
            raise ValueError(f"Session {session_id} not found")

        #Get all user_ids that belong to that event
        user_ids = (
            self.session
            .query(EventUser.user_id)
            .filter(EventUser.event_id == event_id)
            .all()
        )

        user_ids = [row[0] for row in user_ids]

        if not user_ids:
            # No users for this event; nothing to do
            return []

        #Find existing attendance records for this session to avoid duplicates
        existing_user_ids = (
            self.session
            .query(Attendance.user_id)
            .filter(Attendance.session_id == session_id)
            .all()
        )

        existing_user_ids = {row[0] for row in existing_user_ids}

        # Create Attendance rows for users that don't already have one
        new_attendances: list[Attendance] = []

        # skip existing
        for user_id in user_ids:
            if user_id in existing_user_ids:
                continue  

            attendance = Attendance(
                user_id=user_id,
                session_id=session_id,
                status=AttendanceStatus.ABSENT,
            )
            self.session.add(attendance)
            new_attendances.append(attendance)

        self.session.commit()

        # Optionally refresh to get IDs etc.
        for att in new_attendances:
            self.session.refresh(att)

        return new_attendances



    def check_in(self, user_id: int, session_id: int, when: datetime | None = None) -> Attendance:
        """
        Mark a user as checked in for a session.
        If no Attendance exists yet, create one.
        """
        if when is None:
            when = datetime.now(timezone.utc)
            tz_pacific = ZoneInfo("America/Los_Angeles")
            when = when.astimezone(tz_pacific)

        att = (
            self.session.query(Attendance)
            .filter(
                Attendance.user_id == user_id,
                Attendance.session_id == session_id
            )
            .first()
        )

        if not att:
            att = Attendance(
                user_id=user_id,
                session_id=session_id,
                check_in_time=when,
                status=AttendanceStatus.PRESENT,
            )
            self.session.add(att)
        else:
            att.check_in_time = when
            att.status = AttendanceStatus.PRESENT

        self.session.commit()
        self.session.refresh(att)
        return att