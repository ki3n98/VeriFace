from app.db.schema.user import UserOutput
from app.core.database import get_db
from app.service.userService import UserService
from app.util.embeddings import upload_img_to_embedding
from fastapi import APIRouter, Depends, UploadFile, File
from app.util.protectRoute import get_current_user
from app.routers.protected.event.event import eventRouter
from sqlalchemy.orm import Session

protectedRouter = APIRouter()
protectedRouter.include_router(router=eventRouter, tags=["event"], prefix="/event")


@protectedRouter.get("/testToken")
def read_protected(user: UserOutput = Depends(get_current_user)):
    return {"data": user}


@protectedRouter.post("/uploadPicture")
async def upload_picture(
    upload_image: UploadFile = File(...),
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    embedding = await upload_img_to_embedding(upload_image)
    embedding = [float(x) for x in embedding]
    
    try: 
        return UserService(session=session).update_user_by_id(
            user_id=user.id,
            updates={"embedding": embedding}
        )

    except Exception as error:
        print(error)
        raise error