from app.core.database import get_db
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from app.util.protectRoute import get_current_user
from app.util.permission import check_permission, get_event_role, can_assign_role
from app.util.csv_processor import validate_csv_file, parse_and_validate_csv
from app.db.schema.user import UserOutput
from app.db.schema.event import EventInCreate, EventToRemove, EventId, EventOutput, EventWithRole, InviteEmailResponse, UpdateDefaultStartTimeRequest, GetAuditLogRequest
from app.db.schema.event_audit import AuditLogEntryOutput, GetAuditLogResponse
from app.db.models.user import User
from app.service.eventAuditService import EventAuditService, try_log_event_action
from app.db.schema.EventUser import EventUserCreate, EventUserRemove, MemberAddRequest, MemberRemoveRequest, RoleUpdateRequest, MemberWithRole
from app.db.schema.user import UserInCreate
from app.db.schema.csv import CSVUploadSuccess, CSVUploadFailure, CSVRowError
from app.service.eventService import EventService
from app.service.eventUserService import EventUserService
from app.service.userService import UserService
from app.service.emailService import EmailService

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

        #add relationship to EventUser table with owner role
        relationship = EventUserCreate(user_id=user.id, event_id=event.id, role="owner")
        EventUserService(session=session).add_relationship(event_user=relationship)

        return event
    except Exception as error:
        print(error)
        raise error
    

@eventRouter.post("/updateDefaultStartTime")
async def update_default_start_time(
    body: UpdateDefaultStartTimeRequest,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> EventOutput:
    """Update an event's default session start time. Applied to all newly created sessions."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=body.event_id,
            session=session,
            required_role="owner",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to modify this event.",
            )
        event_service = EventService(session=session)
        previous = event_service.get_event_by_id(body.event_id)
        old_time = previous.default_start_time

        event = event_service.update_default_start_time(
            event_id=body.event_id,
            default_start_time=body.default_start_time,
        )
        new_out = EventOutput.model_validate(event)

        def _fmt_time(t) -> str:
            if t is None:
                return "not set"
            return t.strftime("%H:%M")

        try_log_event_action(
            session,
            event_id=body.event_id,
            actor_user_id=user.id,
            action="default_start_time_changed",
            category="update",
            message=(
                f"Changed default session start time from {_fmt_time(old_time)} "
                f"to {_fmt_time(new_out.default_start_time)}"
            ),
            details={
                "previous": _fmt_time(old_time),
                "new": _fmt_time(new_out.default_start_time),
            },
        )
        return new_out
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise error


@eventRouter.post("/removeEvent")
async def remove_event(
    event_to_remove: EventToRemove,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> dict:
    """Remove an event and all related data (sessions, attendance, members)."""
    event_to_remove.user_id = user.id
    try:
        if not check_permission(
            user_id=user.id,
            event_id=event_to_remove.event_id,
            session=session,
            required_role="owner"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the event owner can delete an event.")

        # Cascade delete handles: Attendance → Sessions → EventUsers → Event
        EventService(session=session).remove_event(event_to_remove)
        return {
            "success": True,
            "message": f"{user.first_name} removed event {event_to_remove.event_id} and all of its relationships."
        }
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
        actor_role = get_event_role(
            user_id=user.id,
            event_id=relationship.event_id,
            session=session,
        )
        if actor_role not in {"owner", "admin"}:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to modify event.")
        if not can_assign_role(
            actor_role=actor_role,
            target_current_role=None,
            target_role=relationship.role,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Current user cannot assign that role.",
            )
        
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
            session=session,
            required_role="owner"):
        
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
) -> List[MemberWithRole]:
    try:
        if not check_permission(
            user_id=user.id, 
            event_id=event_id.id,
            session=session,
            required_role="viewer"):
        
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


@eventRouter.get("/getOwnedEvents")
async def get_owned_events(
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> List[EventOutput]:
    try:
        return EventService(session=session).get_events_by_owner(
            user_id=user.id
            )
    except Exception as error:
        print(error)
        raise error


@eventRouter.get("/getManagedEvents")
async def get_managed_events(
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> List[EventWithRole]:
    """Return events where user is owner or admin, with role field."""
    try:
        eu_service = EventUserService(session=session)
        managed = eu_service.get_managed_events(user_id=user.id)

        # Also include owned events (in case owner row doesn't exist in EventUser yet)
        owned_events = EventService(session=session).get_events_by_owner(user_id=user.id)

        result_map = {}
        # Add owned events as owner
        for event in owned_events:
            result_map[event.id] = EventWithRole(
                id=event.id,
                event_name=event.event_name,
                user_id=event.user_id,
                start_date=event.start_date,
                end_date=event.end_date,
                location=event.location,
                default_start_time=event.default_start_time,
                role="owner",
            )
        # Add/overwrite with managed events (which have actual role from EventUser)
        for event, role in managed:
            eid = event.id
            if eid not in result_map:
                result_map[eid] = EventWithRole(
                    id=event.id,
                    event_name=event.event_name,
                    user_id=event.user_id,
                    start_date=event.start_date,
                    end_date=event.end_date,
                    location=event.location,
                    default_start_time=event.default_start_time,
                    role=role,
                )

        return list(result_map.values())
    except Exception as error:
        print(error)
        raise error


@eventRouter.get("/getAllUserEvents")
async def get_all_user_events(
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> List[EventWithRole]:
    """Return all events where user has any role (owner, admin, or member)."""
    try:
        eu_service = EventUserService(session=session)
        all_events = eu_service.get_all_user_events(user_id=user.id)

        # Also include owned events (in case owner row doesn't exist in EventUser yet)
        owned_events = EventService(session=session).get_events_by_owner(user_id=user.id)

        result_map = {}
        # Add owned events as owner
        for event in owned_events:
            result_map[event.id] = EventWithRole(
                id=event.id,
                event_name=event.event_name,
                user_id=event.user_id,
                start_date=event.start_date,
                end_date=event.end_date,
                location=event.location,
                default_start_time=event.default_start_time,
                role="owner",
            )
        # Add remaining events with their actual role
        for event, role in all_events:
            eid = event.id
            if eid not in result_map:
                result_map[eid] = EventWithRole(
                    id=event.id,
                    event_name=event.event_name,
                    user_id=event.user_id,
                    start_date=event.start_date,
                    end_date=event.end_date,
                    location=event.location,
                    default_start_time=event.default_start_time,
                    role=role,
                )

        return list(result_map.values())
    except Exception as error:
        print(error)
        raise error


@eventRouter.post("/{event_id}/updateMemberRole")
async def update_member_role(
    event_id: int,
    body: RoleUpdateRequest,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> dict:
    """Update a member's role according to the event role assignment rules."""
    try:
        actor_role = get_event_role(user_id=user.id, event_id=event_id, session=session)
        if actor_role not in {"owner", "admin"}:
            raise HTTPException(
                status_code=403,
                detail="Current user does not have permission to change member roles."
            )

        if body.user_id == user.id:
            raise HTTPException(status_code=400, detail="You cannot change your own role.")

        target_current_role = get_event_role(
            user_id=body.user_id,
            event_id=event_id,
            session=session,
        )
        if target_current_role is None:
            raise HTTPException(status_code=404, detail="User is not a member of this event.")

        if not can_assign_role(
            actor_role=actor_role,
            target_current_role=target_current_role,
            target_role=body.role,
        ):
            raise HTTPException(
                status_code=403,
                detail="Current user cannot assign that role for this member.",
            )

        success = EventUserService(session=session).update_user_role(
            user_id=body.user_id, event_id=event_id, role=body.role
        )
        if not success:
            raise HTTPException(status_code=404, detail="User is not a member of this event.")

        return {"success": True, "message": f"User {body.user_id} role updated to {body.role}"}
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise HTTPException(status_code=500, detail=str(error))


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
        if not check_permission(
            user_id=user.id,
            event_id=event_id,
            session=session,
            required_role="admin",
        ):
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
    
    except HTTPException as error:
        print(error)
        raise error
    
    except Exception as error:
        print(error)
        raise HTTPException(
            status_code=422,
            detail=f"Failed to process CSV upload: {str(error)}"
        )


@eventRouter.post("/getAuditLog", response_model=GetAuditLogResponse)
async def get_audit_log(
    body: GetAuditLogRequest,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> GetAuditLogResponse:
    """Moderators and above: admin action log for an event."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=body.event_id,
            session=session,
            required_role="moderator",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to view this audit log.",
            )
        rows, has_more = EventAuditService(session=session).list_for_event(
            body.event_id,
            limit=body.limit,
            offset=body.offset,
            category=body.category,
        )
        return GetAuditLogResponse(
            success=True,
            entries=[AuditLogEntryOutput.model_validate(row) for row in rows],
            has_more=has_more,
        )
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise error


@eventRouter.post("/{event_id}/addMember")
async def add_single_member(
    event_id: int,
    member_data: MemberAddRequest,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db)
) -> dict:
    """Add a single member to an event. Creates user if they don't exist."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=event_id,
            session=session,
            required_role="admin",
        ):
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
            # User doesn't exist, create them without a password
            is_new_user = True
            user_data = UserInCreate(
                first_name=first_name,
                last_name=last_name,
                email=email,
            )
            member_user = user_service.signup(user_details=user_data)
        
        # Check if user is already in event (include creator for duplicate check)
        existing_users = event_user_service.get_users(event_id=event_id, exclude_creator=False)
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

        try_log_event_action(
            session,
            event_id=event_id,
            actor_user_id=user.id,
            action="member_added",
            category="add",
            message=f"Added {first_name} {last_name} ({email}) to the event",
            details={
                "user_id": member_user.id,
                "email": email,
                "is_new_user": is_new_user,
            },
        )

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
    """Remove a member from an event"""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=event_id,
            session=session,
            required_role="owner",
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to remove users to that event"
            )
        
        removed_user = session.query(User).filter(User.id == member_id).first()
        removed_name = (
            f"{removed_user.first_name} {removed_user.last_name}".strip()
            if removed_user
            else f"User #{member_id}"
        )
        removed_email = removed_user.email if removed_user else None

        event_user = EventUserRemove(user_id=member_id, event_id=event_id)
        EventUserService(session=session).remove_relationship(event_user)

        try_log_event_action(
            session,
            event_id=event_id,
            actor_user_id=user.id,
            action="member_removed",
            category="remove",
            message=f"Removed {removed_name} from the event",
            details={"user_id": member_id, "email": removed_email},
        )
        return {
            "success": True,
            "message": f"Member {member_id} remove from {event_id}"
        }
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to remove member: {str(error)}"
        )
    
@eventRouter.post("/{event_id}/addRemainingMembers")
async def add_remaining_members(
    event_id: int,
    session: Session = Depends(get_db),
    user: UserOutput = Depends(get_current_user)
):  
    try:
        if not check_permission(
            user_id=user.id,
            event_id=event_id,
            session=session,
            required_role="admin",
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to add users to that event"
            )
        return EventService(session=session).add_new_users(
            event_id,
            )

    except Exception as error:
        print(error)
        raise error


@eventRouter.post("/{event_id}/sendInviteEmails", response_model=InviteEmailResponse)
async def send_invite_emails(
    event_id: int,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> InviteEmailResponse:
    """Send invite emails to all unregistered members in an event."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=event_id,
            session=session,
            required_role="admin",
        ):
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to send invites for this event"
            )

        event = EventService(session=session).get_event_by_id(event_id)
        unregistered_users = EventUserService(session=session).get_unregistered_users(event_id=event_id)

        if not unregistered_users:
            return InviteEmailResponse(
                success=True,
                message="No unregistered users found. All members have already signed up.",
                sent_count=0,
                failed_count=0,
            )

        email_service = EmailService()
        result = email_service.send_bulk_invites(
            recipients=unregistered_users,
            event_name=event.event_name,
        )

        total = result["sent_count"] + result["failed_count"]
        return InviteEmailResponse(
            success=result["failed_count"] == 0,
            message=f"Sent {result['sent_count']} of {total} invite emails.",
            sent_count=result["sent_count"],
            failed_count=result["failed_count"],
            failed_emails=result["failed_emails"],
        )

    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send invite emails: {str(error)}"
        )
    
