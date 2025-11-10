from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from contextlib import asynccontextmanager
from app.util.init_db import create_table
from app.routers.auth import authRouter
from app.util.protectRoute import get_current_user
from app.db.schema.user import UserOutput
from app.db.schema.checkIn import TestPredictIn



@asynccontextmanager
async def lifespan(app:FastAPI):
    print("Writting to table")
    create_table()
    yield


app = FastAPI(lifespan=lifespan)

# /auth/login
# /auth/signup
app.include_router(router=authRouter, tags=["auth"], prefix="/auth")


@app.get("/")
def read_root():
    return {"message": "Hello from Docker!"}

@app.get("/protected")
def read_protected(user: UserOutput = Depends(get_current_user)):
    return {"data": user}


