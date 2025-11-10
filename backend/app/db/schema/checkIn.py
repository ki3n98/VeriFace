from pydantic import EmailStr, BaseModel, ConfigDict
from typing import Union, List
import numpy as np


class CheckIn(BaseModel):
    event: int
    image: np.ndarray
    model_config = ConfigDict(arbitrary_types_allowed=True)



class TestPredictIn(BaseModel):
    image: np.ndarray
    model_config = ConfigDict(arbitrary_types_allowed=True)