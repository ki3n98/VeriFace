from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.util.protectRoute import get_current_user
from app.db.schema.user import UserOutput
from app.service.userService import UserService
from app.core.supabase_client import get_supabase_client, SUPABASE_BUCKET

accountRouter = APIRouter()


@accountRouter.delete("/")
def delete_account(
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    if user.avatar_url:
        try:
            supabase = get_supabase_client()
            supabase.storage.from_(SUPABASE_BUCKET).remove([user.avatar_url])
        except Exception:
            pass

    UserService(session=session).delete_account(user_id=user.id)
    return {"success": True, "message": "Account and all associated data have been deleted."}
