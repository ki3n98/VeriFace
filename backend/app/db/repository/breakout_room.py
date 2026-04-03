from sqlalchemy.orm import Session
from .base import BaseRepository

from app.db.models.breakout_room import BreakoutRoom
from app.db.models.user import User


class BreakoutRoomRepository(BaseRepository):

    def get_assignments(self, event_id: int) -> list[dict]:
        """Return all room assignments for an event with user details."""
        rows = (
            self.session.query(
                BreakoutRoom.user_id,
                BreakoutRoom.room_number,
                User.first_name,
                User.last_name,
                User.email,
            )
            .join(User, User.id == BreakoutRoom.user_id)
            .filter(BreakoutRoom.event_id == event_id)
            .order_by(BreakoutRoom.room_number, User.last_name)
            .all()
        )
        return [
            {
                "user_id": r.user_id,
                "room_number": r.room_number,
                "first_name": r.first_name,
                "last_name": r.last_name,
                "email": r.email,
            }
            for r in rows
        ]

    def upsert_user(self, event_id: int, user_id: int, room_number: int) -> BreakoutRoom:
        """Assign a user to a room, updating if they already have an assignment."""
        row = (
            self.session.query(BreakoutRoom)
            .filter(BreakoutRoom.event_id == event_id, BreakoutRoom.user_id == user_id)
            .first()
        )
        if row:
            row.room_number = room_number
        else:
            row = BreakoutRoom(event_id=event_id, user_id=user_id, room_number=room_number)
            self.session.add(row)
        self.session.commit()
        self.session.refresh(row)
        return row

    def remove_user(self, event_id: int, user_id: int) -> bool:
        """Remove a user's room assignment. Returns True if a row was deleted."""
        deleted = (
            self.session.query(BreakoutRoom)
            .filter(BreakoutRoom.event_id == event_id, BreakoutRoom.user_id == user_id)
            .delete()
        )
        self.session.commit()
        return deleted > 0

    def end_all(self, event_id: int) -> int:
        """Delete all room assignments for an event. Returns count deleted."""
        deleted = (
            self.session.query(BreakoutRoom)
            .filter(BreakoutRoom.event_id == event_id)
            .delete()
        )
        self.session.commit()
        return deleted

    def get_user_room(self, event_id: int, user_id: int) -> dict | None:
        """Return a user's room number and their roommates, or None if unassigned."""
        my_row = (
            self.session.query(BreakoutRoom)
            .filter(BreakoutRoom.event_id == event_id, BreakoutRoom.user_id == user_id)
            .first()
        )
        if not my_row:
            return None

        roommates = (
            self.session.query(
                BreakoutRoom.user_id,
                User.first_name,
                User.last_name,
                User.email,
            )
            .join(User, User.id == BreakoutRoom.user_id)
            .filter(
                BreakoutRoom.event_id == event_id,
                BreakoutRoom.room_number == my_row.room_number,
                BreakoutRoom.user_id != user_id,
            )
            .all()
        )
        return {
            "room_number": my_row.room_number,
            "members": [
                {
                    "user_id": r.user_id,
                    "first_name": r.first_name,
                    "last_name": r.last_name,
                    "email": r.email,
                }
                for r in roommates
            ],
        }
