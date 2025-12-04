# app/db/repository/events.py

from typing import List, Optional
from datetime import datetime

from .base import BaseRepository
from app.db.models.events import Events
from app.db.models.user import User
from app.db.schema.events import EventInCreate, EventInUpdate


class EventRepository(BaseRepository):

    def create_event(self, event_data: EventInCreate, user_ids: Optional[List[int]] = None) -> Events:
        new_event = Events(
            event_name=event_data.event_name,
            start_date=event_data.start_date,
            end_date=event_data.end_date,
            location=event_data.location,
        )
        if user_ids:
            users = (self.session.query(User).filter(User.id.in_(user_ids)).all())
            new_event.users.extend(users)

        self.session.add(instance=new_event)
        self.session.commit()
        self.session.refresh(instance=new_event)

        return new_event

    def get_event_by_id(self, event_id: int) -> Optional[Events]:
        return self.session.query(Events).filter_by(id=event_id).first()

    def get_events_between_date(self, start: datetime, end: datetime) -> List[Events]:
        return (self.session.query(Events).filter(Events.start_date >= start, Events.start_date <= end).all()
        )
    def get_event_by_location(self, location: str) -> List[Events]:
        return (self.session.query(Events).filter(Events.location.ilike(location)).all())

    def update_event(self, event: Events, event_data: EventInUpdate) -> Events:
        if event_data.event_name is not None:
            event.event_name = event_data.event_name
        if event_data.start_date is not None:
            event.start_date = event_data.start_date
        if event_data.end_date is not None:
            event.end_date = event_data.end_date
        if event_data.location is not None:
            event.location = event_data.location

        self.session.commit()
        self.session.refresh(instance=event)
        return event

    def delete_event(self, event: Events) -> None:
        self.session.delete(instance=event)
        self.session.commit()

    def get_students_in_event(self, event_id: int) -> List[User]:
        event = self.session.query(Events).filter_by(id=event_id).first()
        if not event:
            return []
        return event.users

    def add_student_to_event(self, event_id: int, user_id: int) -> Optional[Events]:
        event = self.get_event_by_id(event_id)
        if not event:
            return None

        user = self.session.query(User).filter_by(id=user_id).first()
        if not user:
            return None

        if user not in event.users:
            event.users.append(user)
            self.session.commit()
            self.session.refresh(instance=event)

        return event
    def get_events_for_user(self, user_id: int) -> List[Events]:
        user = self.session.query(User).filter_by(id=user_id).first()
        if not user:
            return []
        return user.events
