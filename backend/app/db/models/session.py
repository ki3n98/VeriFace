from sqlalchemy import Column, Integer, DateTime, String, ForeignKey
from app.core.database import Base
from sqlalchemy import UniqueConstraint

class Session(Base):
    __tablename__ = "Sessions"
    id = Column(Integer, primary_key=True, index=True)

    event_id = Column(Integer, ForeignKey("Events.id"), nullable=False)
    sequence_number = Column(Integer, nullable=False)
    
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)

    location = Column(String(250), nullable=True)

    __table_args__ = (
        UniqueConstraint("event_id", "sequence_number", name="uq_event_sequence"),
    )