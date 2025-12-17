from app.core.database import Base, engine
from app.db.models import user, event, event_user, session

def create_table():
    Base.metadata.create_all(bind=engine)