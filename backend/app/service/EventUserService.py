from app.db.repository.eventUserRepo import EventUserRepository
from app.db.models.event_user import EventUser
from app.db.schema.EventUser import EventUserCreate, EventUserRemove

from sqlalchemy.orm import Session
from fastapi import HTTPException


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
            result = self.__EventUserRepository.remove_relationship(event_user)
            return f"Relation of user ({event_user.user_id}) and  event ({event_user.event_id}) has been removed."

        except Exception as error:
            print(error)
            raise HTTPException(status_code=400, detail="Removing relationship ran into an error.")