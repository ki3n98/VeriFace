from .base import BaseRepository
from app.db.models.event import Event
from app.db.schema.event import EventInCreate
from typing import Any, Dict

from app.db.repository.attendance import AttendanceRepository
from app.db.repository.session import SessionRepository
from app.db.repository.eventUserRepo import EventUserRepository


class EventRepository(BaseRepository):
    def create_event(self, event_data:EventInCreate):
        newEvent = Event(**event_data.model_dump(exclude_none=True))

        self.session.add(instance=newEvent)
        self.session.commit()
        self.session.refresh(instance=newEvent)

        return newEvent
    

    def get_event_by_id(self, id:int) -> Event:
        # event = self.session.query(Event).filter_by(id=id).first()
        event = self.session.get(Event, id)

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


    def delete_event_by_id(self, user_id: int, event_id: int) -> bool:
        """Delete event by id only if current_user_id match with event's user_id. 
        Don't use this method. Most likely it won't work since you have existing relationship with other tables. 
        Use delete_event_cascade instead. - Kien """

        event = self.get_event_by_id(event_id)
        if not event:
            return True

        #check if user has permission to delete event
        if getattr(event, "user_id", None) != user_id:
            return False

        self.session.delete(event)
        self.session.commit()
        return True
    
    
    def get_events_by_owner(self, user_id: int) -> list:
        """Return all events owned by the given user."""
        return self.session.query(Event).filter(Event.user_id == user_id).all()

    def delete_event_cascade(self, user_id: int, event_id: int) -> bool:
        """
        Delete event with all related data (cascade delete).
        Order: Attendance → Sessions → EventUsers → Event
        """
        event = self.get_event_by_id(event_id)
        if not event:
            return True  # Already deleted

        # Check permission
        if getattr(event, "user_id", None) != user_id:
            return False

        # Get all sessions for this event
        session_repo = SessionRepository(session=self.session)
        sessions = session_repo.get_session_by_event_id(event_id)

        # 2. Delete attendance for each session
        attendance_repo = AttendanceRepository(session=self.session)
        for sess in sessions:
            attendance_repo.delete_by_session_id(sess.id)

        # 3. Delete all sessions
        session_repo.delete_by_event_id(event_id)

        # 4. Delete all EventUser relationships
        event_user_repo = EventUserRepository(session=self.session)
        event_user_repo.delete_by_event_id(event_id)

        # 5. Delete the event
        self.session.delete(event)
        self.session.commit()
        return True
    
    
