from app.core.database import Base
from sqlalchemy import Column, Integer, String, DateTime, Time, ForeignKey

class Event(Base):
    __tablename__ = "Events"
    id = Column(Integer, primary_key=True) 

    user_id = Column(ForeignKey("Users.id"))
    event_name = Column(String(250), unique=True)
    start_date = Column(DateTime, nullable = True)
    end_date = Column(DateTime, nullable = True)
    location = Column(String(250), nullable = True)
    default_start_time = Column(Time, nullable=True)  # e.g. 14:30 for 2:30 PM - applied to new sessions