from sqlalchemy.orm import Session

from app.db.models.event_audit_log import EventAuditLog
from app.db.models.user import User

from .base import BaseRepository


class EventAuditLogRepository(BaseRepository):
    def create(
        self,
        *,
        event_id: int,
        actor_user_id: int,
        action: str,
        category: str,
        message: str,
        details: dict | None = None,
    ) -> EventAuditLog:
        row = EventAuditLog(
            event_id=event_id,
            actor_user_id=actor_user_id,
            action=action,
            category=category,
            message=message,
            details=details,
        )
        self.session.add(row)
        self.session.commit()
        self.session.refresh(row)
        return row

    def list_for_event(
        self,
        event_id: int,
        *,
        limit: int = 25,
        offset: int = 0,
        category: str | None = None,
    ) -> tuple[list[dict], bool]:
        q = (
            self.session.query(
                EventAuditLog,
                User.first_name,
                User.last_name,
            )
            .join(User, User.id == EventAuditLog.actor_user_id)
            .filter(EventAuditLog.event_id == event_id)
        )
        if category:
            q = q.filter(EventAuditLog.category == category)
        q = q.order_by(EventAuditLog.created_at.desc())

        fetch_limit = limit + 1
        rows = q.offset(offset).limit(fetch_limit).all()
        has_more = len(rows) > limit
        rows = rows[:limit]

        out: list[dict] = []
        for log, fn, ln in rows:
            out.append(
                {
                    "id": log.id,
                    "event_id": log.event_id,
                    "actor_user_id": log.actor_user_id,
                    "actor_name": f"{fn or ''} {ln or ''}".strip() or "Unknown",
                    "action": log.action,
                    "category": log.category,
                    "message": log.message,
                    "details": log.details,
                    "created_at": log.created_at.isoformat() if log.created_at else None,
                }
            )
        return out, has_more
