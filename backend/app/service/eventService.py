from app.db.repository.eventRepo import EventRepository
from app.db.schema.event import EventInCreate, EventInUpdate, EventOutput, EventToRemove
# from app.db.schema.EventUser import EventUserRemove
# from app.service.eventUserService import EventUserService
from sqlalchemy.orm import Session
from fastapi import HTTPException


class EventService:
    def __init__(self, session:Session):
        self.__eventRepository = EventRepository(session=session)


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
    

    def remove_event(self, event_to_remove: EventToRemove) ->str:
        # EventUserService(session=self.__eventRepository.session).remove_relationship(
        #     event_user=EventUserRemove(user_id=event_to_remove.user_id, event_id=event_to_remove.event_id)
        # )

        result = self.__eventRepository.delete_event_by_id(
            user_id = event_to_remove.user_id, 
            event_id = event_to_remove.event_id
            )

        if result:
            return f"User {event_to_remove.user_id} removed {event_to_remove.event_id}."
        
        raise HTTPException(
            status_code=403, 
            detail="{user_id} is not the owner of {event_id}."
            )
    
    