from .base import BaseRepository
from app.db.models.session import Session as SessionEvent
from app.db.schema.session import SessionInCreate, SessionOutput
from sqlalchemy.exc import NoResultFound
from sqlalchemy import func


class SessionRepository(BaseRepository):

    def create_session(self, session_data: SessionInCreate) -> SessionEvent:
        try:
            # compute sequence number
            session_data.sequence_number = self.__get_next_sequence_number(
                session_data.event_id
            )

            new_session = SessionEvent(**session_data.model_dump(exclude_none=True))

            self.session.add(new_session)
            self.session.commit()
            self.session.refresh(new_session)

            return new_session

        except Exception as error:
            self.session.rollback()
            raise error
 
        
    def __get_next_sequence_number(self, event_id: int) -> int:
        
        max_seq = (
            self.session.query(func.max(SessionEvent.sequence_number))
            .filter(SessionEvent.event_id == event_id)
            .scalar()
        ) 

        return (max_seq if max_seq else 0) + 1
    
    #did not test
    def delete_session(self, session_id: int) -> None:
        session_obj = (
            self.session.query(SessionEvent)
            .filter(SessionEvent.id == session_id)
            .one_or_none()
        )

        if session_obj is None:
            raise NoResultFound(f"Session with id {session_id} not found")

        self.session.delete(session_obj)
        self.session.commit()


    def get_session_by_event_id(self, event_id:int) -> list:
        """Return all sessions for an event."""
        return (
            self.session.query(SessionEvent)
            .filter(SessionEvent.event_id==event_id)
            .all()
        )
    

    def delete_by_event_id(self, event_id:int)->int:
        """Delete all session of an event. Return number of deleted session."""
        deleted = (
            self.session.query(SessionEvent)
            .filter(SessionEvent.event_id==event_id)
            .delete()
        )
        self.session.commit()
        return deleted