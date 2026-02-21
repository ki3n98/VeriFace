from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.util.init_db import create_table
from app.routers.auth import authRouter
from app.routers.protected.protected import protectedRouter
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app:FastAPI):
    print("Writting to table")
    create_table()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router=authRouter, tags=["auth"], prefix="/auth")
app.include_router(router=protectedRouter, tags=["protected"], prefix="/protected")

print("\033[95mFRONTEND PUBLIC ADDRESS: https://conchiferous-nola-pervertible.ngrok-free.dev\033[0m")
print("\033[95mBACKEND PUBLIC ADDRESS: https://shayna-unswabbed-baroquely.ngrok-free.dev\033[0m")

@app.get("/")
def read_root():
    return {"message": "Hello from Docker!"}



