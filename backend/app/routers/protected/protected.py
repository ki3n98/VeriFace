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
from app.routers.protected.breakout import breakoutRouter
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List
import numpy as np
import cv2
from app.service.OcclusionService import occlusion_service


protectedRouter = APIRouter()
protectedRouter.include_router(router=eventRouter, tags=["event"], prefix="/event")
protectedRouter.include_router(router=sessionRouter, tags=["session"], prefix="/session")
protectedRouter.include_router(router=modelRouter, tags=["model"], prefix="/model")
protectedRouter.include_router(router=userSettingRouter, tags=["userSetting"], prefix="/settings")
protectedRouter.include_router(router=avatarRouter, tags=["avatar"], prefix="/avatar")
protectedRouter.include_router(router=achievementsRouter, tags=["achievements"], prefix="/achievements")
protectedRouter.include_router(router=emailChangeRouter, tags=["emailChange"], prefix="/email-change")
protectedRouter.include_router(router=profileRouter, tags=["profile"], prefix="/profile")
protectedRouter.include_router(router=breakoutRouter, tags=["breakout"], prefix="/breakout")


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
            raw = await img.read()
            arr = np.frombuffer(raw, np.uint8)
            bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)

            # Occlusion check
            if occlusion_service.enabled and bgr is not None:
                occluded, conf = occlusion_service.is_occluded(bgr)
                if occluded:
                    print(f"Skipping frame — occlusion detected (conf={conf:.2f})")
                    continue

            # Seek back so upload_img_to_embedding can read the same bytes
            await img.seek(0)
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


@protectedRouter.post("/check-occlusion")
async def check_occlusion(
    upload_image: UploadFile = File(...),
    user: UserOutput = Depends(get_current_user),
):
    raw = await upload_image.read()
    arr = np.frombuffer(raw, np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)

    if bgr is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    if not occlusion_service.enabled:
        return {"occluded": False, "confidence": 0.0, "enabled": False}

    occluded, conf = occlusion_service.is_occluded(bgr)

    return {"occluded": occluded, "confidence": round(conf, 3), "enabled": True}


@protectedRouter.delete("/embedding")
async def reset_embedding(
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    return UserService(session=session).update_user_by_id(
        user_id=user.id,
        updates={"embedding": None}
    )


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