from .base import BaseRepository
from app.db.models.user import User
from app.db.schema.user import UserInCreate
from typing import Any, Dict

class UserRepository(BaseRepository):
    def create_user(self, user_data:UserInCreate):
        newUser = User(**user_data.model_dump(exclude_none=True))

        self.session.add(instance=newUser)
        self.session.commit()
        self.session.refresh(instance=newUser)

        return newUser


    def user_exist_by_email(self, email:str) -> bool:
        user = self.session.query(User).filter_by(email=email).first()
        return bool(user)
    

    def get_user_by_email(self, email:str) -> User:
        user = self.session.query(User).filter_by(email=email).first()
        return user
    

    def get_user_by_id(self, id) -> User:
        user = self.session.query(User).filter_by(id=id).first()
        return user
    
    def update_user_by_id(self, id: int, updates: Dict[str, Any]):
        user = self.get_user_by_id(id=id) 
        if not user:
            return None

        for field, value in updates.items():
            # only set attributes that exist on the model
            if hasattr(user, field):
                setattr(user, field, value)

        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user
    

