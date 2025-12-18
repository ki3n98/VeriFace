from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, NoResultFound

from app.db.models.session import Session as SessionEvent
from app.db.schema.session import SessionInCreate
from app.db.repository.session import SessionRepository


class SessionService:
    def __init__(self, session):
        self.__session_repository = SessionRepository(session=session)


        
    def create_session(self, session_data: SessionInCreate) -> SessionEvent:
        try:
            return self.__session_repository.create_session(session_data)
        except IntegrityError as e:
            print("INTEGRITY ERROR:", repr(e.orig))

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Could not create session (constraint violation).",
            )


        

    def delete_session(self, session_id: int) -> None:

        try:
            self.__session_repository.delete_session(session_id)
        except NoResultFound:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with id={session_id} not found.",
            )
