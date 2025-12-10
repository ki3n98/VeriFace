import requests
from pathlib import Path

BASE_URL = "http://127.0.0.1"
LOGIN_URL = f"{BASE_URL}/auth/login"
UPLOAD_URL = f"{BASE_URL}/protected/uploadPicture"

EMAIL = "test2@example.com"
PASSWORD = "123"
IMAGE_PATH = Path("./test_img.png")


def login_and_get_token() -> str:
    payload = {
        "email": EMAIL,
        "password": PASSWORD,
    }

    headers = {
        "accept": "application/json",
        "Content-Type": "application/json",
    }

    resp = requests.post(LOGIN_URL, json=payload, headers=headers)
    print("Login status:", resp.status_code, resp.text)

    resp.raise_for_status()
    data = resp.json()
    # UserWithToken has "token" field
    return data["token"]


def upload_picture(token: str):
    if not IMAGE_PATH.exists():
        raise FileNotFoundError(f"Image not found: {IMAGE_PATH}")

    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {token}",
        # do NOT manually set Content-Type here; requests will handle multipart
    }

    files = {
        # "upload_image" must match the parameter name in your endpoint
        "upload_image": (
            IMAGE_PATH.name,
            open(IMAGE_PATH, "rb"),
            "image/png",  # or "image/png" etc.
        )
    }

    resp = requests.post(UPLOAD_URL, headers=headers, files=files)
    print("Upload status:", resp.status_code)
    print("Response:", resp.text)
    resp.raise_for_status()


if __name__ == "__main__":
    token = login_and_get_token()
    upload_picture(token)
