"""
Batch upload images to specific user IDs via the godmode endpoint.

Usage:
    python upload_batch.py
"""

import requests
from pathlib import Path

BASE_URL = "http://127.0.0.1"
UPLOAD_URL = f"{BASE_URL}/protected/uploadPictureGodmode"

IMGS_DIR = Path(__file__).parent / "imgs"

# Mapping: image filename -> user_id
# UPLOADS = {
#     "kien.jpg": 1773,
#     "hector.jpg": 1774,
#     "jason.jpg": 1775,
#     "Syn.jpg": 1776,
# }

UPLOADS = {
    "kira.jpg": 13,
#     "hector.jpg": 1774,
#     "jason.jpg": 1775,
#     "Syn.jpg": 1776,
# }
}



def upload(image_path: Path, user_id: int):
    with open(image_path, "rb") as f:
        files = {"upload_image": (image_path.name, f, "image/jpeg")}
        data = {"user_id": str(user_id)}
        resp = requests.post(UPLOAD_URL, data=data, files=files)

    print(f"[{image_path.name} -> user {user_id}] {resp.status_code}: {resp.text}")
    resp.raise_for_status()


if __name__ == "__main__":
    for filename, user_id in UPLOADS.items():
        path = IMGS_DIR / filename
        if not path.exists():
            print(f"SKIP: {path} not found")
            continue
        upload(path, user_id)

    print("\nDone!")
