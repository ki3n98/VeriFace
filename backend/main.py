from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.util.init_db import create_table

@asynccontextmanager
async def lifespan(app:FastAPI):
    print("Writting to table")
    create_table()
    yield

app = FastAPI(lifespan=lifespan)

@app.get("/")
def read_root():
    return {"message": "Hello from Docker!"}