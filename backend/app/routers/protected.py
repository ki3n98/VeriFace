from app.db.schema.user import UserInCreate, UserInLogin, UserWithToken, UserOutput
from app.core.database import get_db
from app.service.userService import UserService
from app.util.embeddings import upload_img_to_embedding
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from pydantic import ValidationError
from app.util.protectRoute import get_current_user

from app.db.repository.userRepo import UserRepository
from sqlalchemy.orm import Session

protectedRouter = APIRouter()

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
    # print(embedding)
    updated_user = UserService(session=session).update_user_by_id(
        user_id=user.id,
        updates={"embedding": embedding}
    )

    return updated_user