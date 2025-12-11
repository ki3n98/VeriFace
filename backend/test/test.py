import requests
from pathlib import Path
from datetime import datetime, timedelta, timezone

BASE_URL = "http://127.0.0.1"
LOGIN_URL = f"{BASE_URL}/auth/login"
UPLOAD_URL = f"{BASE_URL}/protected/uploadPicture"
CREATE_EVENT_URL = f"{BASE_URL}/protected/event/createEvent"
REMOVE_EVENT_URL = f"{BASE_URL}/protected/event/removeEvent"

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


def create_event(token:str):
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {token}",
    }

    start = datetime.now(timezone.utc)
    end = start + timedelta(hours=1)

    event_details = {
        "event_name": "CECS491A-02",
        "start_date": start.isoformat(),  # -> '2025-12-11T18:23:45.123456+00:00'
        "end_date": end.isoformat(),
        "location": "CSULB",
    }

    resp = requests.post(CREATE_EVENT_URL, json=event_details, headers=headers)
    print("Create event satus:", resp.status_code)
    print("Response:", resp.text)
    resp.raise_for_status()

    
def remove_event(token:str, event_id:int):
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {token}",
    }

    payload = { 
        "event_id": event_id
    }

    resp = requests.post(REMOVE_EVENT_URL, json=payload, headers=headers)
    print("Remove event satus:", resp.status_code)
    print("Response:", resp.text)
    resp.raise_for_status()


if __name__ == "__main__":
    token = login_and_get_token()
    # upload_picture(token)
    # event = create_event(token)
    remove_event(token, 3)
    print()
