from app.core.database import Base, engine
from app.db.models import user
from app.db.models import event

def create_table():
    Base.metadata.create_all(bind=engine)