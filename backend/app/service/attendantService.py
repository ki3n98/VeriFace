from app.db.repository.attendance import AttendanceRepository
from app.db.models.attendance import Attendance
from app.db.models.session import Session as SessionModel
from app.db.models.user import User
from app.db.models.event_user import EventUser
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
        best_attendance = None
        best_sim = -1.0

        # 2) For each attendance row, get the user and compare embeddings
        for att in attendances:
            user = self.session.get(User, att.user_id)
            print(user)
            if not user or not user.embedding:
                continue

            user_emb = np.asarray(user.embedding, dtype=float)
            sim = cosine_similarity(query_emb, user_emb)

            if sim > best_sim:
                best_sim = sim
                best_user = user
                best_attendance = att

        # No users had embeddings or similarity too low
        if best_user is None:
            raise HTTPException(
                status_code=422,
                detail="No users with embeddings for this session",
            )

        if best_sim < threshold:
            raise HTTPException(
                status_code=401,
                detail="Face not recognized (similarity below threshold)",
            )

        # 3) Mark this user as PRESENT for this session
        #    (we can reuse repo.check_in, or update best_attendance directly)
        attendance = self.__repo.check_in(
            user_id=best_user.id,
            session_id=session_id,
        )

        return {
            "user_id": best_user.id,
            "name": getattr(best_user, "first_name", None),
            "similarity": best_sim,
            "attendance_id": attendance.id,
            "status": attendance.status,
            "check_in_time": attendance.check_in_time,
        }