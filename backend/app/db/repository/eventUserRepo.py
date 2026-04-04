from .base import BaseRepository
from app.db.schema.EventUser import EventUserCreate, EventUserRemove, MemberWithRole
from app.db.schema.user import UserOutput
from app.db.schema.event import EventOutput
from app.db.models.event_user import EventUser
from app.db.models.user import User
from app.db.models.event import Event

from typing import List, Optional, Tuple


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
    

    def get_user_role(self, user_id: int, event_id: int) -> Optional[str]:
        """Query EventUser for role. Returns None if no relationship exists."""
        eu = (
            self.session.query(EventUser)
            .filter(EventUser.user_id == user_id, EventUser.event_id == event_id)
            .one_or_none()
        )
        return eu.role if eu else None

    def update_user_role(self, user_id: int, event_id: int, role: str) -> bool:
        """Set the role column for an EventUser row."""
        eu = (
            self.session.query(EventUser)
            .filter(EventUser.user_id == user_id, EventUser.event_id == event_id)
            .one_or_none()
        )
        if not eu:
            return False
        eu.role = role
        self.session.commit()
        return True

    def get_managed_events(self, user_id: int) -> List[Tuple[Event, str]]:
        """Return events where user is owner or admin, with their role."""
        rows = (
            self.session.query(Event, EventUser.role)
            .join(EventUser, Event.id == EventUser.event_id)
            .filter(EventUser.user_id == user_id)
            .filter(EventUser.role.in_(["owner", "admin"]))
            .all()
        )
        return rows

    def get_all_user_events(self, user_id: int) -> List[Tuple[Event, str]]:
        """Return ALL events where user has any role, with their role."""
        rows = (
            self.session.query(Event, EventUser.role)
            .join(EventUser, Event.id == EventUser.event_id)
            .filter(EventUser.user_id == user_id)
            .all()
        )
        return rows

    def get_users_from_event(self, event_id: int, exclude_creator: bool = True) -> List[MemberWithRole]:
        """Return users in the event with their roles. By default excludes the event creator (owner) from attendance list."""
        event = self.session.get(Event, event_id)
        creator_id = event.user_id if event else None

        rows = (
            self.session.query(User, EventUser.role)
            .join(EventUser, User.id == EventUser.user_id)
            .filter(EventUser.event_id == event_id)
            .all()
        )
        members = [
            MemberWithRole(
                id=u.id,
                first_name=u.first_name,
                last_name=u.last_name,
                email=u.email,
                role=role
            )
            for u, role in rows
        ]

        if exclude_creator and creator_id is not None:
            members = [m for m in members if m.id != creator_id]

        return members
    

    def get_unregistered_users_from_event(self, event_id: int) -> list:
        """Return users in the event who have not completed registration (password is NULL)."""
        users = (
            self.session.query(User)
            .join(EventUser, User.id == EventUser.user_id)
            .filter(EventUser.event_id == event_id)
            .filter(User.password == None)
            .all()
        )
        return users

    def get_events_for_user(self, user_id: int) -> List[EventOutput]:
        """Return all events that a given user belongs to."""
        events = (
            self.session.query(Event)
            .join(EventUser, Event.id == EventUser.event_id)
            .filter(EventUser.user_id == user_id)
            .all()
        )
        return [EventOutput.model_validate(e, from_attributes=True) for e in events] 
    
