from app.db.repository.eventUserRepo import EventUserRepository
from app.db.models.event_user import EventUser
from app.db.schema.EventUser import EventUserCreate, EventUserRemove
from app.db.schema.event import EventOutput

from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List


class EventUserService:

    def __init__(self, session: Session):
        self.__EventUserRepository = EventUserRepository(session=session)


    def add_relationship(self, event_user: EventUserCreate) -> EventUser:
        try:
            new_relationship = self.__EventUserRepository.add_relationship(event_user)
            return new_relationship
        except Exception as error:
            print(error)
            raise error
        
    
    def remove_relationship(self, event_user: EventUserRemove) -> EventUser:
        try:
            self.__EventUserRepository.remove_relationship(event_user)
            return f"Relation of user ({event_user.user_id}) and  event ({event_user.event_id}) has been removed."

        except Exception as error:
            print(error)
            raise HTTPException(status_code=400, detail="Removing relationship ran into an error.")
        

    def get_users(self, event_id:int) -> List[EventOutput]:
        try:
            return self.__EventUserRepository.get_users_from_event(event_id=event_id)
        except Exception as error:
            print(error)
            raise error
        

    def get_event(self, user_id:int) -> List[EventOutput]:
        try:
            return self.__EventUserRepository.get_events_for_user(user_id=user_id)
        except Exception as error:
            print(error)
            raise error