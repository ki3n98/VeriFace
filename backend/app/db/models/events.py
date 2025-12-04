from app.core.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship


event_user_association = Table(
    "EventUserAssociation",
    Base.metadata,
    Column("event_id", ForeignKey("Events.id"), primary_key=True),
    Column("user_id", ForeignKey("Users.id"), primary_key=True),
)

class Events(Base):
    __tablename__ = "Events"
    id = Column(Integer, primary_key=True)

    user_ids = Column(ForeignKey("Users.id"))
    event_name = Column(String(250))
    start_date = Column(DateTime, nullable = False)
    end_date = Column(DateTime, nullable = False)
    location = Column(String(250), nullable = False)
    
    users = relationship(
        "User",
        secondary=event_user_association,
        back_populates="events"
    )
    