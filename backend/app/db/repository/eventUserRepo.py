from .base import BaseRepository
from app.db.schema.EventUser import EventUserCreate, EventUserRemove
from app.db.schema.user import UserOutput
from app.db.schema.event import EventOutput
from app.db.models.event_user import EventUser
from app.db.models.user import User
from app.db.models.event import Event

from typing import List


class EventUserRepository(BaseRepository):

    def add_relationship(self, event_user:EventUserCreate)->EventUser:
        """
        Add user and event relationship to database. Return False if cannot find either event nor user. True if success. 
        """        
        new_relationship = EventUser(**event_user.model_dump())

        try:
            self.session.add(new_relationship)
            self.session.commit()
            self.session.refresh(new_relationship)
            return new_relationship
        except Exception as error:
            self.session.rollback()
            raise error
        
    
    def remove_relationship(self, event_user:EventUserRemove) -> bool:
        relationship = self.session.get(
            EventUser,
            {
                "user_id": event_user.user_id,
                "event_id": event_user.event_id,
            },
        )

        #can't find relationship
        if not relationship:
            return True
        
        try: 
            self.session.delete(relationship)
            self.session.commit()
            return True
        except Exception as error:
            self.session.rollback()
            raise error


    def delete_by_event_id(self, event_id:int)->int:
        """Delete all event user relationship by event_id. Return number of deleted."""
        deleted = (
            self.session.query(EventUser)
            .filter(EventUser.event_id==event_id)
            .delete()
        )
        self.session.commit()
        return deleted 
    

    def get_users_from_event(self, event_id: int, exclude_creator: bool = True) -> List[UserOutput]:
        """Return users in the event. By default excludes the event creator (admin) from attendance list."""
        event = self.session.get(Event, event_id)
        creator_id = event.user_id if event else None

        users = (
            self.session.query(User)
            .join(EventUser, User.id == EventUser.user_id)
            .filter(EventUser.event_id == event_id)
            .all()
        )
        user_outputs = [UserOutput.model_validate(u, from_attributes=True) for u in users]

        if exclude_creator and creator_id is not None:
            user_outputs = [u for u in user_outputs if u.id != creator_id]

        return user_outputs
    

    def get_events_for_user(self, user_id: int) -> List[EventOutput]:
        """Return all events that a given user belongs to."""
        events = (
            self.session.query(Event)
            .join(EventUser, Event.id == EventUser.event_id)
            .filter(EventUser.user_id == user_id)
            .all()
        )
        return [EventOutput.model_validate(e, from_attributes=True) for e in events] 
    
