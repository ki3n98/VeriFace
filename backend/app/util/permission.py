from fastapi import Depends
from sqlalchemy.orm import Session
from app.service.eventService import EventService

from app.core.database import get_db



def check_permission(
    user_id: int,
    event_id: int,
    session: Session
) -> bool: 
    
    try: 
        event = EventService(session=session).get_event_by_id(event_id)
        return event.user_id == user_id
    
    except Exception as error:
        print(error)
        return False
