from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.util.protectRoute import get_current_user
from app.db.schema.user import UserOutput, UserProfileUpdate
from app.service.userService import UserService

profileRouter = APIRouter()


@profileRouter.patch("/", response_model=UserOutput)
def update_profile(
    body: UserProfileUpdate,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    """Update the current user's first and/or last name."""
    updates = {}
    if body.first_name is not None:
        first_name = body.first_name.strip()
        if not first_name:
            raise HTTPException(status_code=400, detail="First name cannot be empty.")
        updates["first_name"] = first_name
    if body.last_name is not None:
        last_name = body.last_name.strip()
        if not last_name:
            raise HTTPException(status_code=400, detail="Last name cannot be empty.")
        updates["last_name"] = last_name
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update.")

    return UserService(session=session).update_user_by_id(
        user_id=user.id,
        updates=updates,
    )