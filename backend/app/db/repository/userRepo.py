from .base import BaseRepository
from app.db.models.user import User
from app.db.models.attendance import Attendance
from app.db.models.event_user import EventUser
from app.db.models.user_achievement import UserAchievement
from app.db.models.user_setting import UserSetting
from app.db.models.pending_email_change import PendingEmailChange
from app.db.schema.user import UserInCreate
from typing import Any, Dict

class UserRepository(BaseRepository):
    def create_user(self, user_data:UserInCreate) -> User:
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
        # user = self.session.query(User).filter_by(id=id).first()
        user = self.session.get(User, id)
        return user
    
    def delete_user_by_id(self, id: int) -> bool:
        user = self.get_user_by_id(id=id)
        if not user:
            return False
        self.session.query(PendingEmailChange).filter_by(user_id=id).delete()
        self.session.query(UserSetting).filter_by(user_id=id).delete()
        self.session.query(UserAchievement).filter_by(user_id=id).delete()
        self.session.query(Attendance).filter_by(user_id=id).delete()
        self.session.query(EventUser).filter_by(user_id=id).delete()
        self.session.delete(user)
        self.session.commit()
        return True

    def update_user_by_id(self, id: int, updates: Dict[str, Any]) -> User:
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
    

