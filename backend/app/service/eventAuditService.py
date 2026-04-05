from sqlalchemy.orm import Session

from app.db.repository.event_audit_log import EventAuditLogRepository

_MAX_MESSAGE = 512


def try_log_event_action(
    session: Session,
    *,
    event_id: int,
    actor_user_id: int,
    action: str,
    category: str,
    message: str,
    details: dict | None = None,
) -> None:
    """Best-effort audit write; never raises (so primary requests still succeed)."""
    try:
        trimmed = message if len(message) <= _MAX_MESSAGE else message[: _MAX_MESSAGE - 1] + "…"
        EventAuditService(session).log(
            event_id=event_id,
            actor_user_id=actor_user_id,
            action=action,
            category=category,
            message=trimmed,
            details=details,
        )
    except Exception as exc:
        print(f"[EventAuditLog] skipped: {exc}")


class EventAuditService:
    def __init__(self, session: Session) -> None:
        self.__repo = EventAuditLogRepository(session=session)

    def log(
        self,
        *,
        event_id: int,
        actor_user_id: int,
        action: str,
        category: str,
        message: str,
        details: dict | None = None,
    ) -> None:
        self.__repo.create(
            event_id=event_id,
            actor_user_id=actor_user_id,
            action=action,
            category=category,
            message=message,
            details=details,
        )

    def list_for_event(
        self,
        event_id: int,
        *,
        limit: int = 25,
        offset: int = 0,
        category: str | None = None,
    ) -> tuple[list[dict], bool]:
        return self.__repo.list_for_event(
            event_id, limit=limit, offset=offset, category=category
        )
