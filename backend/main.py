from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.util.init_db import create_table
from app.routers.auth import authRouter
from app.routers.protected.protected import protectedRouter


@asynccontextmanager
async def lifespan(app:FastAPI):
    print("Writting to table")
    create_table()
    yield


app = FastAPI(lifespan=lifespan)

app.include_router(router=authRouter, tags=["auth"], prefix="/auth")
app.include_router(router=protectedRouter, tags=["protected"], prefix="/protected")


@app.get("/")
def read_root():
    return {"message": "Hello from Docker!"}



