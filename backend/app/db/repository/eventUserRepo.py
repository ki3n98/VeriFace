from .base import BaseRepository
from app.db.schema.EventUser import EventUserCreate, EventUserRemove
from app.db.models.event_user import EventUser


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


