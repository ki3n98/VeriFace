from sqlalchemy.orm import Session
from app.service.eventService import EventService
from app.service.eventUserService import EventUserService

ROLE_HIERARCHY = {"member": 1, "admin": 2, "owner": 3}


def check_permission(
    user_id: int,
    event_id: int,
    session: Session,
    required_role: str = "admin",
) -> bool:
    """Check whether *user_id* has at least *required_role* on *event_id*.

    Hierarchy: owner(3) > admin(2) > member(1).
    The event creator (Event.user_id) is always treated as owner even if they
    have no EventUser row yet.
    """
    required_level = ROLE_HIERARCHY.get(required_role, 2)

    try:
        # Fallback: event table's user_id is always the owner
        event = EventService(session=session).get_event_by_id(event_id)
        if event.user_id == user_id:
            return True  # owner can do anything

        # Look up the role in EventUser
        role = EventUserService(session=session).get_user_role(user_id, event_id)
        if role is None:
            return False

        user_level = ROLE_HIERARCHY.get(role, 0)
        return user_level >= required_level

    except Exception as error:
        print(error)
        return False
