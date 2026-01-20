from app.core.database import get_db
from fastapi import APIRouter, Depends, HTTPException, status
from app.util.protectRoute import get_current_user
from app.util.permission import check_permission
from app.db.schema.user import UserOutput
from app.db.schema.event import EventInCreate, EventToRemove, EventId, EventOutput
from app.db.schema.EventUser import EventUserCreate, EventUserRemove
from app.service.eventService import EventService
from app.service.eventUserService import EventUserService

from sqlalchemy.orm import Session
from typing import List

eventRouter = APIRouter()
# protectedRouter.include_router(router=, tags=["event"], prefix="/event")


@eventRouter.post("/createEvent")
async def create_event(
    event_details:EventInCreate,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> EventOutput:
    event_details.user_id = user.id
    try:
        event =  EventService(session=session).create_event(event_details=event_details)
        
        #add relationship to EventUser table
        relationship = EventUserCreate(user_id=user.id, event_id=event.id)
        EventUserService(session=session).add_relationship(event_user=relationship)

        return event
    except Exception as error:
        print(error)
        raise error
    

@eventRouter.post("/removeEvent")
async def remove_event(
    event_to_remove:EventToRemove,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    event_to_remove.user_id = user.id
    try:
        return EventService(session=session).remove_event(
            event_to_remove = event_to_remove
            )
    except Exception as error:
        print(error)
        raise error
    

@eventRouter.post("/addEventUserRelationship")
async def add_event_user_relationship(
    relationship:EventUserCreate,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    try:
        if not check_permission(
            user_id=user.id, 
            event_id=relationship.event_id,
            session=session
            ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to modify event.")
        
        return EventUserService(session=session).add_relationship(
            event_user=relationship
            )
    except Exception as error:
        print(error)
        raise error


@eventRouter.post("/removeEventUserRelationship")
async def remove_event_user_relationship(
    relationship:EventUserRemove,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    try:
        if not check_permission(
            user_id=user.id, 
            event_id=relationship.event_id,
            session=session):
        
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to modify event.")
        
        return EventUserService(session=session).remove_relationship(
            event_user=relationship
            )
    except Exception as error:
        print(error)
        raise error


#Have not test
@eventRouter.post("/getUsers")
async def get_users(
    event_id: EventId,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> List[UserOutput]:
    try:
        if not check_permission(
            user_id=user.id, 
            event_id=event_id.id,
            session=session):
        
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission.")
        print(event_id)
        return EventUserService(session=session).get_users(
            event_id=event_id.id
            )
    except Exception as error:
        print(error)
        raise error

#REDUNDANT
@eventRouter.post("/getEvent")
async def get_event_post(
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    try:
        return EventUserService(session=session).get_event(
            user_id=user.id
            )
    except Exception as error:
        print(error)
        raise error

#REDUNDANT
@eventRouter.get("/getEventsFromUser")
async def get_events_from_user(
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    try:
        return EventUserService(session=session).get_event(
            user_id=user.id
            )
    except Exception as error:
        print(error)
        raise error

