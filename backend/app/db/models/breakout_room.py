from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from app.core.database import Base


class BreakoutRoom(Base):
    __tablename__ = "BreakoutRooms"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("Events.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("Users.id"), nullable=False)
    room_number = Column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_event_user_breakout"),
    )
