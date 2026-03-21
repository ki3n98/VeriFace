from app.db.schema.user import UserOutput, UserInUpdate
from app.core.database import get_db
from app.service.userService import UserService
from app.routers.protected.event import eventRouter
from app.routers.protected.session import sessionRouter
from app.routers.protected.model import modelRouter
from app.routers.protected.userSetting import userSettingRouter
from app.util.embeddings import upload_img_to_embedding
from app.util.protectRoute import get_current_user
from app.routers.protected.avatar import avatarRouter
from app.routers.protected.achievements import achievementsRouter
from app.routers.protected.emailChange import emailChangeRouter
from app.routers.protected.profile import profileRouter
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
import numpy as np


protectedRouter = APIRouter()
protectedRouter.include_router(router=eventRouter, tags=["event"], prefix="/event")
protectedRouter.include_router(router=sessionRouter, tags=["session"], prefix="/session")
protectedRouter.include_router(router=modelRouter, tags=["model"], prefix="/model")
protectedRouter.include_router(router=userSettingRouter, tags=["userSetting"], prefix="/settings")
protectedRouter.include_router(router=avatarRouter, tags=["avatar"], prefix="/avatar")
protectedRouter.include_router(router=achievementsRouter, tags=["achievements"], prefix="/achievements")
protectedRouter.include_router(router=emailChangeRouter, tags=["emailChange"], prefix="/email-change")
protectedRouter.include_router(router=profileRouter, tags=["profile"], prefix="/profile")


@protectedRouter.get("/testToken")
def read_protected(user: UserOutput = Depends(get_current_user)):
    return {"data": user}


@protectedRouter.post("/uploadPicture")
async def upload_picture(
    upload_image: UploadFile = File(...),
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
    response_model=UserOutput
):
    embedding = await upload_img_to_embedding(upload_image, multiple=False)
    # upload_img_to_embedding return a list of embeddings hence must squeeze() dimension 0
    embedding = [float(x) for x in embedding.squeeze(0)]

    try:
        return UserService(session=session).update_user_by_id(
            user_id=user.id,
            updates={"embedding": embedding}
        )

    except Exception as error:
        print(error)
        raise error


@protectedRouter.post("/uploadPictureMulti")
async def upload_picture_multi(
    upload_images: List[UploadFile] = File(...),
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    if not upload_images:
        raise HTTPException(status_code=400, detail="No images provided")

    embeddings = []
    for img in upload_images:
        try:
            emb = await upload_img_to_embedding(img, multiple=False)
            embeddings.append(emb.squeeze(0).cpu().numpy())
        except Exception as e:
            print(f"Skipping frame (face not detected): {e}")
            continue

    if not embeddings:
        raise HTTPException(
            status_code=400,
            detail="Could not detect a face in any of the provided frames. Please try again."
        )

    avg = np.mean(embeddings, axis=0)
    norm = np.linalg.norm(avg)
    if norm > 0:
        avg = avg / norm
    embedding = [float(x) for x in avg]

    try:
        return UserService(session=session).update_user_by_id(
            user_id=user.id,
            updates={"embedding": embedding}
        )
    except Exception as error:
        print(error)
        raise error


@protectedRouter.post("/uploadPictureGodmode")
async def upload_picture_godmode(
    upload_image: UploadFile = File(...),
    user_id: int = Form(...),
    session: Session = Depends(get_db),
):
    embedding = await upload_img_to_embedding(upload_image)
    # upload_img_to_embedding return a list of embeddings hence must squeeze() dimension 0
    embedding = [float(x) for x in embedding.squeeze(0)]

    try:
        return UserService(session=session).update_user_by_id(
            user_id=user_id,
            updates={"embedding": embedding}
        )
    except Exception as error:
        print(error)
        raise error