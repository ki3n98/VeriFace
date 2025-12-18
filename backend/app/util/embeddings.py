from app.service.ModelService import ModelService
from starlette.concurrency import run_in_threadpool
from PIL import Image, UnidentifiedImageError
from app.db.models.user import User
from fastapi import UploadFile, File, HTTPException


import numpy as np
import io


model = ModelService()

ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 20 * 1024 * 1024  # 5 MB

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
        


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    if a.shape != b.shape:
        return -1.0
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return -1.0
    return float(np.dot(a, b) / denom)


def same_identity(a, b, threshold=0.5):
    d = cosine_similarity(a, b)
    return d < threshold, d
