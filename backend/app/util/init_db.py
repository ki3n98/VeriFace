from app.core.database import Base, engine
from app.db.models import user

def create_table():
    Base.metadata.create_all(bind=engine)