from pydantic import BaseModel, ConfigDict
from typing import Union
from datetime import datetime

class UserSettingOutput(BaseModel):
    user_id: int
    display_theme: str
class UserSettingUpdate(BaseModel):
    display_theme: str
    #must be either light or dark