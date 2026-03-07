from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.util.protectRoute import get_current_user
from app.db.schema.user import UserOutput
from app.db.models.attendance import Attendance, AttendanceStatus
from app.db.models.session import Session as SessionModel
from app.db.models.event import Event
from app.db.models.event_user import EventUser
from app.db.models.user_achievement import UserAchievement

achievementsRouter = APIRouter()

ALL_ACHIEVEMENT_IDS = ["first-steps", "on-time", "good-boy", "Leader", "goat"]


def _compute_achievements(user_id: int, unearned: set, db: Session) -> set:
    """Run computation only for achievements not yet permanently earned."""
    newly_earned = set()

    if "first-steps" in unearned:
        result = (
            db.query(Attendance)
            .filter(
                Attendance.user_id == user_id,
                Attendance.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
            )
            .first()
        )
        if result:
            newly_earned.add("first-steps")

    if "on-time" in unearned:
        attended = (
            db.query(Attendance.status, SessionModel.start_time)
            .join(SessionModel, SessionModel.id == Attendance.session_id)
            .filter(
                Attendance.user_id == user_id,
                Attendance.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
            )
            .order_by(SessionModel.start_time)
            .all()
        )
        streak = max_streak = 0
        for status, _ in attended:
            if status == AttendanceStatus.PRESENT:
                streak += 1
                max_streak = max(max_streak, streak)
            else:
                streak = 0
        if max_streak >= 3:
            newly_earned.add("on-time")

    # --- Good Boy / Leader / Goat: need event membership ---
    needs_events = unearned & {"good-boy", "Leader", "goat"}
    if needs_events:
        event_ids = [
            row[0]
            for row in db.query(EventUser.event_id)
            .filter(EventUser.user_id == user_id)
            .all()
        ]

        # --- Good Boy: 100% attendance (no ABSENT) in at least one event ---
        if "good-boy" in unearned:
            for event_id in event_ids:
                session_ids = [
                    row[0]
                    for row in db.query(SessionModel.id)
                    .filter(SessionModel.event_id == event_id)
                    .all()
                ]
                if not session_ids:
                    continue
                user_attendance = (
                    db.query(Attendance)
                    .filter(
                        Attendance.user_id == user_id,
                        Attendance.session_id.in_(session_ids),
                    )
                    .all()
                )
                if len(user_attendance) == len(session_ids) and all(
                    a.status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE)
                    for a in user_attendance
                ):
                    newly_earned.add("good-boy")
                    break

        if "Leader" in unearned:
            is_admin = (
                db.query(EventUser)
                .filter(EventUser.user_id == user_id, EventUser.role == "owner")
                .first()
            )
            is_creator = (
                db.query(Event)
                .filter(Event.user_id == user_id)
                .first()
            )
            if is_admin or is_creator:
                newly_earned.add("Leader")

        # --- Goat: highest attendance rate in at least one event ---
        if "goat" in unearned:
            for event_id in event_ids:
                session_ids = [
                    row[0]
                    for row in db.query(SessionModel.id)
                    .filter(SessionModel.event_id == event_id)
                    .all()
                ]
                if not session_ids:
                    continue
                total_sessions = len(session_ids)
                counts = (
                    db.query(Attendance.user_id, func.count(Attendance.id))
                    .filter(
                        Attendance.session_id.in_(session_ids),
                        Attendance.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
                    )
                    .group_by(Attendance.user_id)
                    .all()
                )
                if not counts:
                    continue
                rate_map = {uid: cnt / total_sessions for uid, cnt in counts}
                user_rate = rate_map.get(user_id, 0)
                if user_rate > 0 and user_rate >= max(rate_map.values()):
                    newly_earned.add("goat")
                    break

    return newly_earned


@achievementsRouter.get("")
def get_achievements(
    user: UserOutput = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = user.id

    # Fetch permanently stored achievements
    stored = {
        row[0]
        for row in db.query(UserAchievement.achievement_id)
        .filter(UserAchievement.user_id == user_id)
        .all()
    }

    # Only compute for achievements not yet earned
    unearned = set(ALL_ACHIEVEMENT_IDS) - stored
    newly_earned = _compute_achievements(user_id, unearned, db)

    # Persist any newly earned achievements (one-way door)
    for achievement_id in newly_earned:
        db.add(UserAchievement(user_id=user_id, achievement_id=achievement_id))
    if newly_earned:
        try:
            db.commit()
        except IntegrityError:
            db.rollback()

    all_earned = stored | newly_earned

    return {
        "data": [
            {"id": aid, "earned": aid in all_earned}
            for aid in ALL_ACHIEVEMENT_IDS
        ]
    }
