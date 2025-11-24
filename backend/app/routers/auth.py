from app.db.schema.user import UserInCreate, UserInLogin, UserWithToken, UserOutput
from app.core.database import get_db
from app.service.userService import UserService
from app.util.embeddings import upload_img_to_embedding
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from pydantic import ValidationError

from app.db.repository.userRepo import UserRepository

import numpy as np
authRouter = APIRouter()

@authRouter.post("/login", status_code=200, response_model=UserWithToken)
def login(loginDetails: UserInLogin, session: Session = Depends(get_db)):
    try:
        user_repo = UserRepository(session=session)
        user = user_repo.get_user_by_email(loginDetails.email)

        print(f"User: {user.first_name} {user.last_name}, {user.email} is logged in.")
        return UserService(session=session).login(login_details=loginDetails)
    except Exception as error:
        print(error)
        raise error


# Dependency: take the form field "signUpDetails" (a JSON string) ➜ UserInCreate
async def parse_sign_up_details(signUpDetails: str = Form(...)) -> UserInCreate:
    try:
        return UserInCreate.model_validate_json(signUpDetails)
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=e.errors())



@authRouter.post("/signup", status_code=201, response_model=UserOutput)
async def signup(
        signUpDetails: UserInCreate = Depends(parse_sign_up_details), 
        upload_image: UploadFile = File(...), 
        session: Session = Depends(get_db)
        ):
    try:
        embedding = await upload_img_to_embedding(upload_image)
        signUpDetails.embedding = [float(x) for x in embedding]
        print(embedding)
        return UserService(session=session).signup(
            user_details=signUpDetails
            )

    except Exception as error:
        print(error)
        raise error
    

