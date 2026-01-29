import requests
from pathlib import Path
from datetime import datetime, timedelta, timezone

BASE_URL = "http://127.0.0.1"
LOGIN_URL = f"{BASE_URL}/auth/login"
UPLOAD_URL = f"{BASE_URL}/protected/uploadPicture"
CREATE_EVENT_URL = f"{BASE_URL}/protected/event/createEvent"
REMOVE_EVENT_URL = f"{BASE_URL}/protected/event/removeEvent"
ADD_RELATIONSHIP_UR = f"{BASE_URL}/protected/event/addEventUserRelationship"
REMOVE_RELATIONSHIP_UR = f"{BASE_URL}/protected/event/removeEventUserRelationship"
GET_USERS_URL = f"{BASE_URL}/protected/event/getUsers"
CREATE_SESSION_URL = f"{BASE_URL}/protected/session/createSession"
HAS_EMBEDDING_URL = f"{BASE_URL}/protected/model/hasEmbedding"

EMAIL = "test2@example.com"
PASSWORD = "123"
# IMAGE_PATH = Path("./test_img.png")


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
        "event_name": "CECS491A-DEMO",
        "start_date": start.isoformat(),  # -> '2025-12-11T18:23:45.123456+00:00'
        "end_date": end.isoformat(),
        "location": "CSULB",
    }

    resp = requests.post(CREATE_EVENT_URL, json=event_details, headers=headers)
    print("Create event satus:", resp.status_code)
    print("Response:", resp.text)
    resp.raise_for_status()
    return resp.json()

    
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

def add_relationship(token:str, event_id):
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {token}",
    }

    payload = {
        "event_id": event_id,
        "user_id": 4
    }

    resp = requests.post(ADD_RELATIONSHIP_UR, json=payload, headers=headers)
    print("add event user relationship satus:", resp.status_code)
    print("Response:", resp.text)
    resp.raise_for_status()

def remove_relationship(token:str, event_id):
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {token}",
    }

    payload = {
        "event_id": 7,
        "user_id": 4
    }

    resp = requests.post(REMOVE_RELATIONSHIP_UR, json=payload, headers=headers)
    print("remove event user relationship satus:", resp.status_code)
    print("Response:", resp.text)
    resp.raise_for_status()


def get_user(token:str, event_id):
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {token}",
    }

    payload = {
        "id": event_id    
    }

    resp = requests.post(GET_USERS_URL, json=payload, headers=headers)
    print("Get user:", resp.status_code)
    print("Response:", resp.text)
    resp.raise_for_status()


def create_session(token:str, event_id=7):
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {token}",
    }

    payload = {
        "event_id": event_id    
    }

    resp = requests.post(CREATE_SESSION_URL, json=payload, headers=headers)
    print("create session:", resp.status_code)
    print("Response:", resp.text)
    resp.raise_for_status()
    return resp.json()


def has_embedding(token:str):
    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {token}",
    }


    resp = requests.post(HAS_EMBEDDING_URL, headers=headers)
    print("has embedding session:", resp.status_code)
    print("Response:", resp.text)
    resp.raise_for_status()


def upload_picture_godmode(user_id, IMAGE_PATH):
    if not IMAGE_PATH.exists():
        raise FileNotFoundError(f"Image not found: {IMAGE_PATH}")

    # This will be sent as form fields in the multipart request
    data = {
        "user_id": str(user_id),  # or just user_id, both are fine
    }

    with open(IMAGE_PATH, "rb") as f:
        files = {
            "upload_image": (
                IMAGE_PATH.name,
                f,
                "image/jpeg",  # or "image/png", etc.
            )
        }

        resp = requests.post(UPLOAD_URL, data=data, files=files)
        print("Upload status:", resp.status_code)
        print("Response:", resp.text)
        resp.raise_for_status()


def check_in(session_id, IMAGE_PATH): 
    if not IMAGE_PATH.exists():
        raise FileNotFoundError(f"Image not found: {IMAGE_PATH}")

    
    checkin_url = f"{BASE_URL}/protected/session/checkin"

    with open(IMAGE_PATH, "rb") as f:
        files = {
            "upload_image": (
                IMAGE_PATH.name,
                f,
                "image/jpeg",  # or "image/png", etc.
            )
        }

        resp = requests.post(
            checkin_url,
            params={"session_id": session_id},
            files=files,
        )
        print("check in status:", resp.status_code)
        print("Response:", resp.text)
        resp.raise_for_status()


if __name__ == "__main__":
    token = login_and_get_token()
    # session = create_session(token, 15)
    upload_picture_godmode(12, Path("./jason.jpg"))
    session_id = 21
    check_in(session_id, Path("./hector.jpg"))