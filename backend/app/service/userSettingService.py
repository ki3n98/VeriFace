from sqlalchemy.orm import Session
from app.db.models.user_setting import UserSetting
from app.db.schema.user_setting import UserSettingUpdate
#from fastapi import HTTPException

class UserSettingService:
    def __init__(self, session: Session):
        self.session = session
    
    def get_user_settings(self, user_id: int):
        settings = self.session.query(UserSetting).filter(
            UserSetting.user_id == user_id).first()
        
        # Create default settings if none exist
        if not settings:
            settings = UserSetting(
                user_id=user_id,
                display_theme="light"
            )
            self.session.add(settings)
            self.session.commit()
            self.session.refresh(settings)
        
        return settings
    
    def update_user_settings(self, user_id: int, updates: UserSettingUpdate):
        settings = self.get_user_settings(user_id)
        settings.display_theme = updates.display_theme
        self.session.commit()
        self.session.refresh(settings)
        return settings
