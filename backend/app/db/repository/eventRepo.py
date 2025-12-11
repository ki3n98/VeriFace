from .base import BaseRepository
from app.db.models.event import Event
from app.db.schema.event import EventInCreate
from typing import Any, Dict

class EventRepository(BaseRepository):
    def create_event(self, event_data:EventInCreate):
        newEvent = Event(**event_data.model_dump(exclude_none=True))

        self.session.add(instance=newEvent)
        self.session.commit()
        self.session.refresh(instance=newEvent)

        return newEvent
    

    def get_event_by_id(self, id:int) -> Event:
        event = self.session.query(Event).filter_by(id=id).first()
        return event
    
    
    def get_event_by_name(self, name:str) -> Event:
        event = self.session.query(Event).filter_by(event_name=name).first()
        return event
    

    def update_event_by_id(self, id:int, updates: Dict[str,Any]) -> Event:
        event = self.get_event_by_id(id)
        if not event:
            return None
        
        for field, value in updates.items():
            if hasattr(event, field):
                setattr(event,field,value)

        self.session.add(event)
        self.session.commit()
        self.session.refresh(event)
        return event


    def delete_event_by_id(self, id: int, current_user_id: int) -> bool:
        """Delete event by id only if current_user_id match with event's user_id. """
        event = self.get_event_by_id(id)
        if not event:
            return True

        #check if user has permission to delete event
        if getattr(event, "user_id", None) != current_user_id:
            return False

        self.session.delete(event)
        self.session.commit()
        return True
