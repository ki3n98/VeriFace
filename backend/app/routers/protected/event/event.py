from app.core.database import get_db
from fastapi import APIRouter, Depends
from app.util.protectRoute import get_current_user
from app.db.schema.user import UserOutput
from app.service.eventService import EventService
from app.db.schema.event import EventInCreate

from sqlalchemy.orm import Session

eventRouter = APIRouter()
# protectedRouter.include_router(router=, tags=["event"], prefix="/event")


@eventRouter.post("/createEvent")
async def create_event(
    event_details:EventInCreate,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    event_details.user_id = user.id
    try:
        return EventService(session=session).create_event(
            event_details=event_details
            )
    except Exception as error:
        print(error)
        raise error


