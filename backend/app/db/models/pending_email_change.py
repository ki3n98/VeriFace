from app.core.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey


class PendingEmailChange(Base):
    __tablename__ = "PendingEmailChanges"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("Users.id"), nullable=False, index=True)
    new_email = Column(String(100), nullable=False)
    token = Column(String(100), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)