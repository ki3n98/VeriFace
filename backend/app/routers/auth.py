from fastapi import APIRouter, Depends, UploadFile, File, Form
from app.db.schema.user import UserInCreate, UserInLogin, UserWithToken, UserOutput
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.service.userService import UserService
from app.util.embeddings import upload_img_to_embedding

import numpy as np
authRouter = APIRouter()

@authRouter.post("/login", status_code=200, response_model=UserWithToken)
def login(loginDetails: UserInLogin, session: Session = Depends(get_db)):
    try:
        return UserService(session=session).login(login_details=loginDetails)
    except Exception as error:
        print(error)
        raise error


@authRouter.post("/signup", status_code=201, response_model=UserOutput)
async def signup(
        signUpDetails: str = Form(...), 
        upload_image: UploadFile = File(...), 
        session: Session = Depends(get_db)
        ):
    try:
        details = UserInCreate.model_validate_json(signUpDetails)
        embedding = await upload_img_to_embedding(upload_image)
        details.embedding = [float(x) for x in embedding]
        print(embedding)
        return UserService(session=session).signup(
            user_details=details
            )

    except Exception as error:
        print(error)
        raise error