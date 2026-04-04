from sqlalchemy.orm import Session
from app.service.eventService import EventService
from app.service.eventUserService import EventUserService

EVENT_ROLES = {"owner", "admin", "moderator", "viewer", "member"}
ROLE_HIERARCHY = {
    "member": 1,
    "viewer": 2,
    "moderator": 3,
    "admin": 4,
    "owner": 5,
}


def get_event_role(
    user_id: int,
    event_id: int,
    session: Session,
) -> str | None:
    try:
        event = EventService(session=session).get_event_by_id(event_id)
        if event.user_id == user_id:
            return "owner"

        role = EventUserService(session=session).get_user_role(user_id, event_id)
        if role in EVENT_ROLES:
            return role
        return None
    except Exception as error:
        print(error)
        return None


def can_assign_role(
    actor_role: str | None,
    target_current_role: str | None,
    target_role: str,
) -> bool:
    if actor_role not in EVENT_ROLES:
        return False
    if target_role not in EVENT_ROLES or target_role == "owner":
        return False
    if target_current_role == "owner":
        return False

    if actor_role == "owner":
        return True

    if actor_role == "admin":
        if target_current_role in {"owner", "admin"}:
            return False
        return target_role in {"moderator", "viewer", "member"}

    return False


def check_permission(
    user_id: int,
    event_id: int,
    session: Session,
    required_role: str = "admin",
) -> bool:
    """Check whether *user_id* has at least *required_role* on *event_id*.

    Role gate:
    owner > admin > moderator > viewer > member
    The event creator (Event.user_id) is always treated as owner even if they
    have no EventUser row yet.
    """
    if required_role == "member":
        allowed_roles = {"owner", "admin", "moderator", "viewer", "member"}
    elif required_role == "viewer":
        allowed_roles = {"owner", "admin", "moderator", "viewer"}
    elif required_role == "moderator":
        allowed_roles = {"owner", "admin", "moderator"}
    elif required_role == "admin":
        allowed_roles = {"owner", "admin"}
    elif required_role == "owner":
        allowed_roles = {"owner"}
    else:
        required_level = ROLE_HIERARCHY.get(required_role, ROLE_HIERARCHY["admin"])
        allowed_roles = {
            role for role, level in ROLE_HIERARCHY.items() if level >= required_level
        }

    try:
        role = get_event_role(user_id=user_id, event_id=event_id, session=session)
        if role is None:
            return False
        return role in allowed_roles

    except Exception as error:
        print(error)
        return False
