from app.db.schema.user import UserInCreate, UserInLogin, UserWithToken, UserOutput
from app.core.database import get_db
from app.service.userService import UserService
# from app.util.embeddings import upload_img_to_embedding
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from pydantic import ValidationError

from app.db.repository.userRepo import UserRepository

#/auth
authRouter = APIRouter()


@authRouter.post("/login", status_code=200, response_model=UserWithToken)
def login(loginDetails: UserInLogin, session: Session = Depends(get_db)):
    try:
        user_service = UserService(session=session)
        user = user_service.get_user_by_email(loginDetails.email)

        print(f"User: {user.first_name} {user.last_name}, {user.email} is logged in.")
        return user_service.login(login_details=loginDetails)
    except Exception as error:
        print(error)
        raise error


@authRouter.post("/signup", status_code=201, response_model=UserOutput)
async def signup(
        signUpDetails: UserInCreate = UserInCreate, 
        session: Session = Depends(get_db)
        ):
    try:
        return UserService(session=session).signup(
            user_details=signUpDetails
            )

    except Exception as error:
        print(error)
        raise error
    


