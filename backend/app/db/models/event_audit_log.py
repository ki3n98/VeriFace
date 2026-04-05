from datetime import datetime, timezone

from app.core.database import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String


class EventAuditLog(Base):
    __tablename__ = "EventAuditLogs"

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("Events.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_user_id = Column(Integer, ForeignKey("Users.id"), nullable=False)
    action = Column(String(64), nullable=False)
    category = Column(String(16), nullable=False)
    message = Column(String(512), nullable=False)
    details = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
