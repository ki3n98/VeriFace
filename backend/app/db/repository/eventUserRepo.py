from .base import BaseRepository
from app.db.schema.EventUser import EventUserCreate, EventUserRemove
from app.db.schema.user import UserOutput
from app.db.schema.event import EventOutput
from app.db.models.event_user import EventUser
from app.db.models.user import User
from app.db.models.event import Event


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


    def get_users_from_event(self, event_id: int) -> list[UserOutput]:
        users = (
            self.session.query(EventUser)
            .join(User, User.id == EventUser.user_id)
            .filter(EventUser.event_id == event_id)
            .all()
        )
        return [UserOutput.model_validate(u) for u in users]
    

    def get_events_from_user(self, user_id: int) -> list[EventOutput]:
        """Return all events that a given user belongs to."""
        events = (
            self.session.query(EventUser)
            .join(Event, Event.id == EventUser.event_id)
            .filter(EventUser.user_id == user_id)
            .all()
        )

        return [EventOutput.from_orm(e) for e in events] 

