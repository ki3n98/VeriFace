from sqlalchemy import select
from sqlalchemy.orm import Session
from .base import BaseRepository
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.db.models.attendance import Attendance, AttendanceStatus
from app.db.models.session import Session as SessionModel
from app.db.models.event import Event
from app.db.models.event_user import EventUser
from app.db.models.user import User


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




    def check_in(
        self,
        user_id: int,
        session_id: int,
        when: datetime | None = None,
        session_start_time: datetime | None = None,
    ) -> Attendance:
        """
        Mark a user as checked in for a session.
        If session_start_time is set and when > session_start_time, status is LATE; else PRESENT.
        """
        if when is None:
            when = datetime.now(timezone.utc)
            tz_pacific = ZoneInfo("America/Los_Angeles")
            when = when.astimezone(tz_pacific)

        if session_start_time is not None and session_start_time.tzinfo is None:
            session_start_time = session_start_time.replace(tzinfo=ZoneInfo("America/Los_Angeles"))

        if session_start_time is not None and when.tzinfo is None:
            when = when.replace(tzinfo=ZoneInfo("America/Los_Angeles"))

        status = AttendanceStatus.PRESENT
        if session_start_time is not None:
            status = AttendanceStatus.LATE if when > session_start_time else AttendanceStatus.PRESENT

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
                status=status,
            )
            self.session.add(att)
        else:
            att.check_in_time = when
            att.status = status

        self.session.commit()
        self.session.refresh(att)
        return att
    

    def update_status(
        self, user_id: int, session_id: int, status: AttendanceStatus
    ) -> tuple[Attendance | None, str | None]:
        """
        Manually update a user's attendance status for a session.
        For present/late, sets check_in_time if not already set.
        Returns (record, previous_status_value) or (None, None) if missing.
        """
        att = (
            self.session.query(Attendance)
            .filter(
                Attendance.user_id == user_id,
                Attendance.session_id == session_id,
            )
            .first()
        )
        if not att:
            return None, None

        old_status = (
            att.status.value if hasattr(att.status, "value") else str(att.status)
        )
        att.status = status
        if status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE):
            if att.check_in_time is None:
                when = datetime.now(timezone.utc)
                tz_pacific = ZoneInfo("America/Los_Angeles")
                att.check_in_time = when.astimezone(tz_pacific)
        elif status == AttendanceStatus.ABSENT:
            att.check_in_time = None

        self.session.commit()
        self.session.refresh(att)
        return att, old_status

    def get_attendance_by_session_id(
        self, session_id: int, exclude_creator: bool = True
    ) -> list[dict]:
        """Return attendance records for a session with user details. Excludes event creator (admin) by default."""
        # Get event creator to exclude from attendance list
        creator_id = None
        if exclude_creator:
            session_obj = self.session.get(SessionModel, session_id)
            if session_obj:
                event_obj = self.session.get(Event, session_obj.event_id)
                if event_obj:
                    creator_id = event_obj.user_id

        rows = (
            self.session.query(
                Attendance.user_id,
                User.first_name,
                User.last_name,
                User.email,
                Attendance.status,
                Attendance.check_in_time,
            )
            .join(User, User.id == Attendance.user_id)
            .filter(Attendance.session_id == session_id)
            .all()
        )
        result = [
            {
                "user_id": r.user_id,
                "first_name": r.first_name,
                "last_name": r.last_name,
                "email": r.email,
                "status": r.status,
                "check_in_time": r.check_in_time,
            }
            for r in rows
        ]
        if creator_id is not None:
            result = [r for r in result if r["user_id"] != creator_id]
        return result

    def get_event_attendance_overview(
        self, event_id: int, exclude_creator: bool = True
    ) -> dict:
        """
        Return attendance aggregates for an event, per session and overall.
        Excludes event creator (admin) by default.
        """
        from sqlalchemy import func

        creator_id = None
        if exclude_creator:
            event_obj = self.session.get(Event, event_id)
            if event_obj:
                creator_id = event_obj.user_id

        # Get all sessions for this event
        sessions = (
            self.session.query(SessionModel.id, SessionModel.sequence_number)
            .filter(SessionModel.event_id == event_id)
            .order_by(SessionModel.sequence_number)
            .all()
        )

        per_session = []
        total_present = 0
        total_late = 0
        total_absent = 0

        for sess_id, seq_num in sessions:
            q = (
                self.session.query(Attendance.status, func.count(Attendance.id))
                .filter(Attendance.session_id == sess_id)
            )
            if creator_id is not None:
                q = q.filter(Attendance.user_id != creator_id)
            counts = q.group_by(Attendance.status).all()
            present = late = absent = 0
            for status, cnt in counts:
                val = status.value if hasattr(status, "value") else str(status)
                if val == "present":
                    present = cnt
                elif val == "late":
                    late = cnt
                elif val == "absent":
                    absent = cnt

            total = present + late + absent
            total_present += present
            total_late += late
            total_absent += absent

            per_session.append({
                "session_id": sess_id,
                "sequence_number": seq_num,
                "label": f"Session {seq_num}",
                "present": present,
                "late": late,
                "absent": absent,
                "total": total,
            })

        return {
            "per_session": per_session,
            "overall": {
                "present": total_present,
                "late": total_late,
                "absent": total_absent,
                "total": total_present + total_late + total_absent,
            },
        }

    def get_user_attendance_for_event(self, user_id: int, event_id: int) -> list[dict]:
        """Return all attendance records for a specific user across all sessions of an event."""
        rows = (
            self.session.query(
                Attendance.session_id,
                SessionModel.sequence_number,
                SessionModel.start_time,
                Attendance.status,
                Attendance.check_in_time,
            )
            .join(SessionModel, SessionModel.id == Attendance.session_id)
            .filter(SessionModel.event_id == event_id)
            .filter(Attendance.user_id == user_id)
            .order_by(SessionModel.sequence_number)
            .all()
        )
        return [
            {
                "session_id": r.session_id,
                "sequence_number": r.sequence_number,
                "start_time": r.start_time,
                "status": r.status.value if hasattr(r.status, "value") else r.status,
                "check_in_time": r.check_in_time,
            }
            for r in rows
        ]

    def delete_by_session_id(self, session_id:int) -> int:
        """Delete all attended records by session_id. Return counts deleted."""
        deleted = (
            self.session.query(Attendance)
            .filter(Attendance.session_id == session_id)
            .delete()
        )
        self.session.commit()
        return deleted
    
