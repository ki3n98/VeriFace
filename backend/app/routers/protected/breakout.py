from pydantic import BaseModel
from typing import List

from app.db.schema.user import UserOutput
from app.service.breakoutService import BreakoutService
from app.core.database import get_db
from app.util.protectRoute import get_current_user
from app.util.permission import check_permission
from app.util.ws_manager import breakout_manager
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, status


class EventIdRequest(BaseModel):
    event_id: int


class AutoAssignRequest(BaseModel):
    event_id: int
    num_rooms: int
    user_ids: List[int]


class PushUsersRequest(BaseModel):
    event_id: int
    room_number: int
    user_ids: List[int]


class RemoveUserRequest(BaseModel):
    event_id: int
    user_id: int


breakoutRouter = APIRouter()


async def _broadcast_assignments(event_id: int, service: BreakoutService) -> None:
    """Broadcast the current room assignments to all connected session clients."""
    session_id = service.get_latest_session_id(event_id)
    if session_id is None:
        return
    assignments = service.get_assignments(event_id)
    await breakout_manager.broadcast_to_session(session_id, {
        "type": "breakout_update",
        "data": {"assignments": assignments},
    })


@breakoutRouter.post("/getBreakoutRooms")
async def get_breakout_rooms(
    body: EventIdRequest,
    user: UserOutput = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Get all current room assignments for an event."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=body.event_id,
            session=db,
            required_role="moderator",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to view this event.",
            )
        assignments = BreakoutService(session=db).get_assignments(body.event_id)
        return {"success": True, "assignments": assignments}
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise


@breakoutRouter.post("/getUsersInSession")
async def get_users_in_session(
    body: EventIdRequest,
    user: UserOutput = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Get users who are currently checked into the latest session."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=body.event_id,
            session=db,
            required_role="moderator",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to view this event.",
            )
        users = BreakoutService(session=db).get_users_in_session(body.event_id)
        return {"success": True, "users": users}
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise


@breakoutRouter.post("/autoAssign")
async def auto_assign(
    body: AutoAssignRequest,
    user: UserOutput = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Auto-assign a list of users evenly across rooms, then broadcast update."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=body.event_id,
            session=db,
            required_role="moderator",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to modify this event.",
            )
        service = BreakoutService(session=db)
        service.auto_assign(body.event_id, body.num_rooms, body.user_ids)
        await _broadcast_assignments(body.event_id, service)
        return {"success": True, "message": f"Assigned {len(body.user_ids)} users to {body.num_rooms} rooms."}
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise


@breakoutRouter.post("/pushUsers")
async def push_users(
    body: PushUsersRequest,
    user: UserOutput = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Assign one or more users to a specific room, then broadcast update."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=body.event_id,
            session=db,
            required_role="moderator",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to modify this event.",
            )
        service = BreakoutService(session=db)
        service.push_users(body.event_id, body.room_number, body.user_ids)
        await _broadcast_assignments(body.event_id, service)
        return {"success": True, "message": f"Assigned {len(body.user_ids)} user(s) to room {body.room_number}."}
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise


@breakoutRouter.post("/removeUser")
async def remove_user(
    body: RemoveUserRequest,
    user: UserOutput = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Remove a user from their breakout room, then broadcast update."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=body.event_id,
            session=db,
            required_role="moderator",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to modify this event.",
            )
        service = BreakoutService(session=db)
        service.remove_user(body.event_id, body.user_id)
        await _broadcast_assignments(body.event_id, service)
        return {"success": True, "message": "User removed from breakout room."}
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise


@breakoutRouter.post("/endBreakoutRooms")
async def end_breakout_rooms(
    body: EventIdRequest,
    user: UserOutput = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Delete all room assignments for an event and broadcast empty update."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=body.event_id,
            session=db,
            required_role="moderator",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to modify this event.",
            )
        service = BreakoutService(session=db)
        # Broadcast empty assignments before deleting so clients see the clear
        session_id = service.get_latest_session_id(body.event_id)
        service.end_rooms(body.event_id)
        if session_id:
            await breakout_manager.broadcast_to_session(session_id, {
                "type": "breakout_update",
                "data": {"assignments": []},
            })
        return {"success": True, "message": "Breakout rooms ended."}
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise


@breakoutRouter.post("/getMyRoom")
async def get_my_room(
    body: EventIdRequest,
    user: UserOutput = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Return the current user's room assignment and roommates."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=body.event_id,
            session=db,
            required_role="member",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user is not a member of this event.",
            )
        result = BreakoutService(session=db).get_my_room(body.event_id, user.id)
        return {"success": True, **result}
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise
