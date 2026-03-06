from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.util.protectRoute import get_current_user
from app.db.schema.user import UserOutput
from app.service.userService import UserService
from app.core.supabase_client import get_supabase_client, SUPABASE_BUCKET

avatarRouter = APIRouter()

@avatarRouter.post("/upload")
async def upload_avatar(
    file: UploadFile = File(...),
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    path = f"{user.id}/avatar.{ext}"
    file_bytes = await file.read()

    supabase = get_supabase_client()
    supabase.storage.from_(SUPABASE_BUCKET).upload(
        path, file_bytes, {"content-type": file.content_type, "upsert": "true"}
    )

    UserService(session=session).update_user_by_id(
        user_id=user.id, updates={"avatar_url": path}
    )

    result = supabase.storage.from_(SUPABASE_BUCKET).create_signed_url(path, 3600)
    return {"signed_url": result["signedURL"]}


@avatarRouter.get("/url")
def get_avatar_url(user: UserOutput = Depends(get_current_user)):
    if not user.avatar_url:
        return {"signed_url": None}

    supabase = get_supabase_client()
    result = supabase.storage.from_(SUPABASE_BUCKET).create_signed_url(user.avatar_url, 3600)
    return {"signed_url": result["signedURL"]}
