from app.core.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey

class Events(Base):
    __tablename__ = "Events"
    id = Column(Integer, primary_key=True)

    user_ids = Column(ForeignKey("Users.id"))
    event_name = Column(String(250))
    start_date = Column(DateTime, nullable = False)
    end_date = Column(DateTime, nullable = False)
    location = Column(String(250), nullable = False)