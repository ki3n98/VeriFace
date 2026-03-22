from app.db.repository.eventRepo import EventRepository
from app.db.schema.event import EventInCreate, EventInUpdate, EventOutput, EventToRemove
# from app.db.schema.EventUser import EventUserRemove
# from app.service.eventUserService import EventUserService
from app.db.repository.attendance import AttendanceRepository
from app.db.models.session import Session as SessionEvent


from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import time


class EventService:
    def __init__(self, session:Session):
        self.__eventRepository = EventRepository(session=session)
        self.session = session


    def create_event(self, event_details:EventInCreate) -> EventOutput:
        #event name exit
        if self.__eventRepository.get_event_by_name(name=event_details.event_name):
            raise HTTPException(
                status_code=400, 
                detail="Event name exist. Choose a different name."
                )

        try:
            event = self.__eventRepository.create_event(event_details)
            return EventOutput.model_validate(event)
        except Exception as error:
            print(error)
            raise error

    def get_event_by_id(self, event_id:int) -> EventOutput:
        event = self.__eventRepository.get_event_by_id(id=event_id)
        if event:
            return event
        raise HTTPException(status_code=400, detail="Event id does not exist.")

    def update_default_start_time(
        self, event_id: int, default_start_time: str | None
    ) -> "Event":
        """Update event's default session start time. Parses 'HH:MM' or 'HH:MM:SS'."""
        parsed: time | None = None
        if default_start_time:
            parts = default_start_time.strip().split(":")
            if len(parts) >= 2:
                try:
                    h, m = int(parts[0]), int(parts[1])
                    s = int(parts[2]) if len(parts) > 2 else 0
                    if 0 <= h <= 23 and 0 <= m <= 59 and 0 <= s <= 59:
                        parsed = time(hour=h, minute=m, second=s)
                except ValueError:
                    pass
        return self.__eventRepository.update_event_by_id(
            id=event_id, updates={"default_start_time": parsed}
        )
    

    def remove_event(self, event_to_remove: EventToRemove) -> int:
        # EventUserService(session=self.__eventRepository.session).remove_relationship(
        #     event_user=EventUserRemove(user_id=event_to_remove.user_id, event_id=event_to_remove.event_id)
        # )

        result = self.__eventRepository.delete_event_cascade(
            user_id = event_to_remove.user_id, 
            event_id = event_to_remove.event_id
            )

        if result:
            return f"User {event_to_remove.user_id} removed {event_to_remove.event_id}."
        
        raise HTTPException(
            status_code=403, 
            detail="{user_id} is not the owner of {event_id}."
            )
    
    def get_events_by_owner(self, user_id: int) -> list:
        return self.__eventRepository.get_events_by_owner(user_id=user_id)

    def add_new_users(self,event_id) ->None:
        sessions = (
            self.session
            .query(SessionEvent.id)
            .filter(SessionEvent.event_id == event_id)
            .all()
            
        )
        if not sessions:
            raise HTTPException(
                status_code = 400,
                detail = f"No sessions found with event {event_id}."
            )
        for s in sessions:
            att = AttendanceRepository(session=self.session)
            att.add_users(s.id)