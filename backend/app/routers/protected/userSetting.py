from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.util.protectRoute import get_current_user
from app.db.schema.user import UserOutput
from app.db.schema.user_setting import UserSettingOutput, UserSettingUpdate
from app.service.userSettingService import UserSettingService

userSettingRouter = APIRouter()

@userSettingRouter.get("/", response_model = UserSettingOutput)
def getSettings(
    #Will learn what Depends does lmao
    user: UserOutput  = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    service = UserSettingService(session = session)
    return service.get_user_settings(user.id)

@userSettingRouter.patch("/", response_model = UserSettingOutput)
def updateSettings(
    settings: UserSettingUpdate, user:UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    service = UserSettingService(session = session)
    return service.update_user_settings(user.id, settings)