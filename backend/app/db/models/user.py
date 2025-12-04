from app.core.database import Base
from sqlalchemy import Column, Integer, String, ARRAY, Float

from app.db.models.events import event_user_association 
from sqlalchemy.orm import relationship


class User(Base):
    __tablename__ = "Users"
    id = Column(Integer, primary_key=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String(250))
    embedding = Column(ARRAY(Float), nullable=True)

    events = relationship(
        "Events",
        secondary=event_user_association,
        back_populates="users"
    )