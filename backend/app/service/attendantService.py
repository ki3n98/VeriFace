from app.db.repository.attendance import AttendanceRepository
from app.db.models.attendance import Attendance
from app.db.models.session import Session as SessionModel
from app.db.models.user import User
from app.db.models.event_user import EventUser
from app.util.datetime_json import utc_iso_z
from app.util.embeddings import cosine_similarity

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import numpy as np



class AttendanceService:
    def __init__(self, session: Session):
        self.__repo = AttendanceRepository(session=session)
        self.session = session

    def add_users_for_session(self, session_id: int) -> list[Attendance]:
        return self.__repo.add_users(session_id)

    def update_attendance_status(
        self, user_id: int, session_id: int, status: str
    ) -> dict:
        """Manually update a user's attendance status for a session."""
        from app.db.models.attendance import AttendanceStatus

        status_map = {
            "present": AttendanceStatus.PRESENT,
            "late": AttendanceStatus.LATE,
            "absent": AttendanceStatus.ABSENT,
        }
        status_enum = status_map.get(status.lower())
        if status_enum is None:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status '{status}'. Must be present, late, or absent.",
            )

        att, previous_status = self.__repo.update_status(
            user_id, session_id, status_enum
        )
        if att is None:
            raise HTTPException(
                status_code=404,
                detail="Attendance record not found for this user and session.",
            )

        return {
            "user_id": att.user_id,
            "session_id": att.session_id,
            "status": att.status.value,
            "check_in_time": utc_iso_z(att.check_in_time),
            "previous_status": previous_status,
        }

    def get_event_attendance_overview(self, event_id: int) -> dict:
        """Return attendance aggregates for an event (per session and overall)."""
        return self.__repo.get_event_attendance_overview(event_id)

    def get_session_attendance(self, session_id: int) -> dict:
        records = self.__repo.get_attendance_by_session_id(session_id)
        summary = {"present": 0, "late": 0, "absent": 0, "total": len(records)}
        for r in records:
            status_val = r["status"].value if hasattr(r["status"], "value") else r["status"]
            if status_val in summary:
                summary[status_val] += 1
        return {"attendance": records, "summary": summary}
    

    def get_user_attendance_for_event(self, user_id: int, event_id: int) -> dict:
        """Return a user's attendance across all sessions of an event with summary stats."""
        sessions = self.__repo.get_user_attendance_for_event(user_id, event_id)
        total = len(sessions)
        present = sum(1 for s in sessions if s["status"] == "present")
        late = sum(1 for s in sessions if s["status"] == "late")
        absent = sum(1 for s in sessions if s["status"] == "absent")
        attendance_rate = round(((present + late) / total) * 100, 1) if total > 0 else 0.0

        return {
            "sessions": sessions,
            "summary": {
                "total_sessions": total,
                "present": present,
                "late": late,
                "absent": absent,
                "attendance_rate": attendance_rate,
            },
        }

    def check_in_with_embedding(
        self,
        session_id: int,
        face_embedding: list[float],
        threshold: float = 0.5,
    ):
        """
        Given a session_id and a face embedding:
        - find all Attendance rows for that session
        - for each attendance.user_id, load User and its embedding
        - compute cosine similarity between face_embedding and user.embedding
        - pick best match above threshold and mark them PRESENT
        """

        # 1) Find all attendance records for this session
        attendances = (
            self.session
            .query(Attendance)
            .filter(Attendance.session_id == session_id)
            .all()
        )

        if not attendances:
            raise HTTPException(
                status_code=404,
                detail="No attendance records for this session",
            )

        query_emb = np.asarray(face_embedding, dtype=float)

        best_user = None
        best_sim = float('-inf')

        # 2) For each attendance row, get the user and compare embeddings
        for att in attendances:
            user = self.session.get(User, att.user_id)
            if not user or not user.embedding:
                continue

            user_emb = np.asarray(user.embedding, dtype=float)
            sim = cosine_similarity(query_emb, user_emb)

            if sim > best_sim:
                best_sim = sim
                best_user = user

        # No users had embeddings
        if best_user is None:
            raise HTTPException(
                status_code=420,
                detail="Could not find the user to checkin, please try again.",
            )

        # Reject low-similarity matches before anything else
        if best_sim < threshold:
            raise HTTPException(
                status_code=422,
                detail="This student is not recognized please try again.",
            )

        best_user_id = best_user.id
        attendance = (
            self.session
            .query(Attendance)
            .filter(Attendance.session_id == session_id,
                    Attendance.user_id == best_user_id)
            .first()
        )

        if attendance.status == "present":
            return {
                "user_id": best_user.id,
                "first_name": getattr(best_user, "first_name", None),
                "last_name": getattr(best_user, "last_name", None),
                "already_checked_in": True,
                "status": "present",
            }

        session_obj = self.session.get(SessionModel, session_id)
        session_start_time = session_obj.start_time if session_obj else None

        attendance = self.__repo.check_in(
            user_id=best_user.id,
            session_id=session_id,
            session_start_time=session_start_time,
        )

        return {
            "user_id": best_user.id,
            "first_name": getattr(best_user, "first_name", None),
            "last_name": getattr(best_user, "last_name", None),
            "similarity": best_sim,
            "attendance_id": attendance.id,
            "status": attendance.status,
            "check_in_time": utc_iso_z(attendance.check_in_time),
        }