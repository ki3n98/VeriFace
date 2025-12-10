from app.db.repository.userRepo import UserRepository
from app.db.schema.user import UserOutput, UserInCreate, UserInLogin, UserWithToken
from app.core.security.hashHelper import HashHelper
from app.core.security.authHandler import AuthHandler
from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Any, Dict

import numpy as np

class UserService:
    def __init__(self, session: Session):
        self.__userRepository = UserRepository(session=session)


    def signup(self, user_details: UserInCreate) -> UserOutput:
        if self.__userRepository.user_exist_by_email(email=user_details.email):
            raise HTTPException(status_code=400, detail="Email exist. Please Login")

        hashed_password = HashHelper.get_password_hash(plain_pw=user_details.password)
        user_details.password = hashed_password
        return self.__userRepository.create_user(user_data=user_details)


    def login(self, login_details:UserInLogin) ->UserWithToken:
        if not self.__userRepository.user_exist_by_email(email=login_details.email):
            raise HTTPException(status_code=400, detail="Email does not exist. Please create an account.")

        user = self.__userRepository.get_user_by_email(email=login_details.email)

        if HashHelper.verify_password(plain_pw=login_details.password, hashed_pw=user.password):
            token = AuthHandler.sign_jwt(user_id=user.id)

            if token:
                return UserWithToken(token=token)
            raise HTTPException(status_code=500, detail="Unable to process request")
        raise HTTPException(status_code=400, detail="PLease check your password")


    def get_user_by_id(self, user_id:int) -> UserOutput:
        user = self.__userRepository.get_user_by_id(id=user_id)
        if user:
            return user
        raise HTTPException(status_code=400, detail="User Id does not exist.")
    

    def update_user_by_id(self, user_id: int, updates: Dict[str, Any]) -> UserOutput:
        # Make sure the user exists
        user = self.__userRepository.get_user_by_id(id=user_id)
        if not user:
            raise HTTPException(status_code=400, detail="User Id does not exist.")

        # Special handling for password
        if "password" in updates and updates["password"] is not None:
            updates["password"] = HashHelper.get_password_hash(
                plain_pw=updates["password"]
            )

        if "embedding" in updates and updates["embedding"] is not None:
            # Ensure it's a list of floats 
            emb = updates["embedding"]
            updates["embedding"] = [float(x) for x in emb]

        updated_user = self.__userRepository.update_user_by_id(
            id=user_id,
            updates=updates
        )

        return updated_user