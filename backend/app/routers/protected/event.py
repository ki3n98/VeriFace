from app.core.database import get_db
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from app.util.protectRoute import get_current_user
from app.util.permission import check_permission
from app.util.csv_processor import validate_csv_file, parse_and_validate_csv
from app.db.schema.user import UserOutput
from app.db.schema.event import EventInCreate, EventToRemove, EventId, EventOutput
from app.db.schema.EventUser import EventUserCreate, EventUserRemove, MemberAddRequest, MemberRemoveRequest
from app.db.schema.user import UserInCreate
from app.db.schema.csv import CSVUploadSuccess, CSVUploadFailure, CSVRowError
from app.service.eventService import EventService
from app.service.eventUserService import EventUserService
from app.service.userService import UserService

from sqlalchemy.orm import Session
from typing import List, Union

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
        EventUserService(session=session).remove_relationship(
            event_user=EventUserRemove(user_id=user.id, event_id=event_to_remove.event_id)
        )
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


@eventRouter.post(
    "/{event_id}/uploadUserCSV",
    response_model=Union[CSVUploadSuccess, CSVUploadFailure]
    )
async def upload_users_csv(
    event_id:int,
    csv_file: UploadFile = File(..., description="CSV file with colums: first_name, last_name, email (max 500 rows)"),
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db)
) -> Union[CSVUploadSuccess, CSVUploadFailure]: 
    """Bulk add users to an event via CSV upload."""
    try:
        if not check_permission(user_id=user.id, event_id=event_id, session=session):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to add users to that event"
            )
        
        #validate type and sizze
        await validate_csv_file(csv_file)

        valid_rows, parse_errors = await parse_and_validate_csv(csv_file, max_rows=500)

        if parse_errors: 
            # Convert parse errors to CSVRowError objects
            csv_errors = []
            for err in parse_errors:
                csv_errors.append(CSVRowError(
                    row_number=int(err['row_number']),
                    first_name=str(err['first_name']),
                    last_name=str(err['last_name']),
                    email=str(err['email']),
                    error_message=str(err['error_message'])
                ))
            
            return CSVUploadFailure(
                message="CSV validation failed. No users were added to the event.",
                total_rows=len(valid_rows) + len(parse_errors),
                valid_rows=len(valid_rows),
                invalid_rows=len(parse_errors),
                errors=csv_errors
            )
        
        if not valid_rows: 
            print("No valid rows found in CSV file")
            raise HTTPException(
                status_code=400,
                detail="No valid rows found in CSV file"
            )

        result = EventUserService(session=session).bulk_add_users_from_csv(
            event_id=event_id,
            csv_rows=valid_rows
        )

        return result
    
    # except HTTPException:
    #     raise
    except Exception as error:
        print(error)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process CSV upload: {str(error)}"
        )


@eventRouter.post("/{event_id}/addMember")
async def add_single_member(
    event_id: int,
    member_data: MemberAddRequest,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db)
) -> dict:
    """Add a single member to an event. Creates user if they don't exist."""
    try:
        if not check_permission(user_id=user.id, event_id=event_id, session=session):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to add users to that event"
            )
        
        # Extract and validate fields
        first_name = member_data.first_name.strip()
        last_name = member_data.last_name.strip()
        email = member_data.email.strip()
        
        if not first_name:
            raise HTTPException(status_code=400, detail="First name is required")
        if not last_name:
            raise HTTPException(status_code=400, detail="Last name is required")
        
        # Use EventUserService to add member (handles user creation if needed)
        event_user_service = EventUserService(session=session)
        user_service = UserService(session=session)
        
        # Check if member user exists
        member_user = None
        is_new_user = False
        try:
            member_user = user_service.get_user_by_email(user_email=email)
        except HTTPException:
            # User doesn't exist, create them
            is_new_user = True
            from app.util.csv_processor import generate_random_password
            temp_password = generate_random_password()
            user_data = UserInCreate(
                first_name=first_name,
                last_name=last_name,
                email=email,
                password=temp_password
            )
            member_user = user_service.signup(user_details=user_data)
        
        # Check if user is already in event
        existing_users = event_user_service.get_users(event_id=event_id)
        existing_users_ids = [u.id for u in existing_users]
        if member_user.id in existing_users_ids:
            return {
                "success": False,
                "message": "User is already a member of this event",
                "user_id": member_user.id
            }
        
        # Add user to event
        relationship = EventUserCreate(user_id=member_user.id, event_id=event_id)
        event_user_service.add_relationship(event_user=relationship)
        
        return {
            "success": True,
            "message": f"Successfully added {'new' if is_new_user else 'existing'} user to event",
            "user_id": member_user.id,
            "is_new_user": is_new_user
        }
    
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add member: {str(error)}"
        )
    



@eventRouter.post("/{event_id}/removeMember")
async def remove_member(
    event_id: int,
    member_id: int,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db)
) -> dict:
    """Add a single member to an event. Creates user if they don't exist."""
    try:
        if not check_permission(user_id=user.id, event_id=event_id, session=session):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to add users to that event"
            )
        
        event_user = EventUserRemove(user_id=member_id, event_id=event_id)
        response = EventUserService(session=session).remove_relationship(event_user)
        return response

    
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to remove member: {str(error)}"
        )