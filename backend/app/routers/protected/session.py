from pydantic import BaseModel

from app.db.schema.user import UserOutput
from app.db.schema.session import SessionInCreate, SessionOutput
from app.db.schema.attendance import AttendanceWithUser
from app.service.sessionService import SessionService
from app.service.attendantService import AttendanceService
from app.core.database import get_db
from app.util.protectRoute import get_current_user
from app.util.permission import check_permission
from app.db.models.session import Session as SessionModel
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from app.util.embeddings import upload_img_to_embedding


class SessionIdRequest(BaseModel):
    session_id: int

sessionRouter = APIRouter()

@sessionRouter.post("/createSession")
async def create_session_attendance(
    session_data : SessionInCreate, 
    user: UserOutput = Depends(get_current_user), 
    session: Session = Depends(get_db)
    ) -> dict:
    try:
        if not check_permission(
            user_id=user.id, 
            event_id=session_data.event_id,
            session=session
            ):
        
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to modify event.")
        
        #create session
        event_session = SessionService(session=session).create_session(session_data=session_data)

        #create attendance
        AttendanceService(session=session).add_users_for_session(session_id=event_session.id)

        return {
            "success": True,
            "session": SessionOutput.model_validate(event_session, from_attributes=True)
        }
        
    
    except Exception as error:
        print(error)
        raise error



@sessionRouter.post("/getSessions")
async def get_sessions(
    session_data: SessionInCreate,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> dict:
    try:
        if not check_permission(
            user_id=user.id,
            event_id=session_data.event_id,
            session=session,
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to view event sessions.",
            )

        sessions = SessionService(session=session).get_sessions_by_event_id(
            event_id=session_data.event_id
        )

        return {
            "success": True,
            "sessions": [
                SessionOutput.model_validate(s, from_attributes=True) for s in sessions
            ],
        }
    except Exception as error:
        print(error)
        raise error


@sessionRouter.post("/getAttendance")
async def get_attendance(
    body: SessionIdRequest,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> dict:
    try:
        # Look up the session to get event_id for permission check
        session_obj = (
            session.query(SessionModel)
            .filter(SessionModel.id == body.session_id)
            .one_or_none()
        )
        if session_obj is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with id={body.session_id} not found.",
            )

        if not check_permission(
            user_id=user.id,
            event_id=session_obj.event_id,
            session=session,
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to view this session.",
            )

        result = AttendanceService(session=session).get_session_attendance(
            session_id=body.session_id
        )

        return {
            "success": True,
            "attendance": [
                AttendanceWithUser.model_validate(a) for a in result["attendance"]
            ],
            "summary": result["summary"],
        }
    except Exception as error:
        print(error)
        raise error


@sessionRouter.post("/checkin")
async def check_in_with_face(
    session_id: int,
    upload_image: UploadFile = File(...),
    session: Session = Depends(get_db),
):
    try:
    # Convert image -> face embedding (ensures 1 face, size, etc.)
        embedding = await upload_img_to_embedding(upload_image)
        embedding = [float(x) for x in embedding]  # ensure JSON-serializable list

        # Use service to find matching user and check them in
        service = AttendanceService(session=session)
        result = service.check_in_with_embedding(session_id=session_id, face_embedding=embedding)
    except Exception as error:
        print(error)
        raise error 

    return result


        
    


