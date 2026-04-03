from app.core.database import Base, engine
from app.db.models import user, event, event_user, session, attendance, user_achievement, pending_email_change, breakout_room

def create_table():
    Base.metadata.create_all(bind=engine)