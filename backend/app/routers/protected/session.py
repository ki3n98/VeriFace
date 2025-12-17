from app.db.schema.user import UserOutput
from app.db.schema.session import SessionInCreate
from app.service.sessionService import SessionService
from app.core.database import get_db
from app.util.protectRoute import get_current_user
from app.util.permission import check_permission
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

sessionRouter = APIRouter()

@sessionRouter.post("/createSession")
def create_session(
    session_data : SessionInCreate, 
    user: UserOutput = Depends(get_current_user), 
    session: Session = Depends(get_db)
    ):
    try:
        if not check_permission(
            user_id=user.id, 
            event_id=session_data.event_id,
            session=session
            ):
        
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to modify event.")
        
        return SessionService(session=session).create_session(session_data=session_data)
    
    except Exception as error:
        print(error)
        raise error


    


