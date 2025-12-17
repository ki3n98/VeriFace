from app.service.ModelService import ModelService
from starlette.concurrency import run_in_threadpool
from PIL import Image, UnidentifiedImageError
from app.db.models.user import User
import numpy as np
import io

from fastapi import UploadFile, File, HTTPException


model = ModelService()


ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB

def _bytes_to_rgb_array(data: bytes) -> np.ndarray:
    try:
        with Image.open(io.BytesIO(data)) as img:
            img = img.convert("RGB")  # ensure RGB
            arr = np.asarray(img)     # H x W x 3, dtype=uint8
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Invalid image file")
    return arr


async def upload_img_to_embedding(upload_image: UploadFile = File(...)):
    if upload_image.content_type not in ALLOWED:
        raise HTTPException(status_code=415, detail=f"Unsupported media type: {upload_image.content_type}")

    data = await upload_image.read(MAX_SIZE + 1)
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large (max {MAX_SIZE // (1024*1024)} MB)")

    image_array = _bytes_to_rgb_array(data)

    embeddings = await run_in_threadpool(model.img_to_embedding, image_array)

    if len(embeddings) > 2:
        raise HTTPException(status_code=422, detail="Detected 2 or more faces.")
    if len(embeddings) == 0:
        raise HTTPException(status_code=422, detail="Cannot detect a face.")

    return embeddings[0]


async def has_embedding(session, user_id: int) -> bool: 
        try:
            user = session.get(User, user_id)
            #print(user.embedding)
            return len(user.embedding) > 1
        
        except Exception as error: 
            print(error)
            raise error
    