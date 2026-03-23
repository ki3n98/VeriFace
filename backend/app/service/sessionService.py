from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, NoResultFound
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from app.db.models.session import Session as SessionEvent
from app.db.models.event import Event
from app.db.schema.session import SessionInCreate
from app.db.repository.session import SessionRepository


class SessionService:
    def __init__(self, session):
        self.__session_repository = SessionRepository(session=session)
        self.session = session


    def create_session(self, session_data: SessionInCreate) -> SessionEvent:
        try:
            if session_data.start_time is None:
                event = self.session.get(Event, session_data.event_id)
                if event and event.default_start_time:
                    tz = ZoneInfo("America/Los_Angeles")
                    today = date.today()
                    combined = datetime.combine(
                        today,
                        event.default_start_time,
                        tzinfo=tz,
                    )
                    # Store as naive datetime in local time so PostgreSQL
                    # doesn't convert to UTC (avoids 7-hour display shift)
                    session_data.start_time = combined.replace(tzinfo=None)
            return self.__session_repository.create_session(session_data)
        except IntegrityError as e:
            print("INTEGRITY ERROR:", repr(e.orig))

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Could not create session (constraint violation).",
            )


    def get_sessions_by_event_id(self, event_id: int) -> list:
        return self.__session_repository.get_session_by_event_id(event_id)

    def delete_session(self, session_id: int) -> None:

        try:
            self.__session_repository.delete_session(session_id)
        except NoResultFound:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with id={session_id} not found.",
            )
        

        
