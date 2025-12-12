from app.core.database import Base
from sqlalchemy import Column, ForeignKey, Integer

class EventUser(Base):
    __tablename__ = "EventsUsers"
    user_id = Column(Integer,ForeignKey("Users.id"), primary_key=True)
    event_id = Column(Integer, ForeignKey("Events.id"), primary_key=True)