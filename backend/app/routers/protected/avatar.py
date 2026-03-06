import tempfile
import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from nudenet import NudeDetector
from app.core.database import get_db
from app.util.protectRoute import get_current_user
from app.db.schema.user import UserOutput
from app.service.userService import UserService
from app.core.supabase_client import get_supabase_client, SUPABASE_BUCKET

avatarRouter = APIRouter()

_detector = NudeDetector()

_NSFW_CLASSES = {
    "FEMALE_GENITALIA_EXPOSED",
    "FEMALE_BREAST_EXPOSED",
    "MALE_GENITALIA_EXPOSED",
    "BUTTOCKS_EXPOSED",
    "ANUS_EXPOSED",
}

def _is_nsfw(image_bytes: bytes, threshold: float = 0.5) -> bool:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(image_bytes)
        tmp_path = tmp.name
    try:
        detections = _detector.detect(tmp_path)
        return any(
            d["class"] in _NSFW_CLASSES and d["score"] >= threshold
            for d in detections
        )
    finally:
        os.unlink(tmp_path)

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

    if _is_nsfw(file_bytes):
        raise HTTPException(status_code=400, detail="Image contains inappropriate content and cannot be uploaded")

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
