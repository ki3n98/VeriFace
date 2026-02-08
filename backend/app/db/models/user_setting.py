from app.core.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey

class UserSetting(Base):
    __tablename__ = "UserSettings"
    user_id = Column(Integer,ForeignKey("Users.id"), primary_key=True)
    display_theme = Column(String(200), nullable=False)
