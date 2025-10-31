import jwt
from dotenv import load_dotenv
import time, os

load_dotenv()

JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM")

class AuthHandler(object):

    @staticmethod
    def sign_jwt(user_id: int) -> str:
        payload = {
            "user_id": user_id,
            "expires": time.time() + 9000
        }

        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return token


    @staticmethod
    def decode_jwt(token:str) -> dict | None:
        try:
            decode_token = jwt.decode(token, JWT_SECRET, algorithms=JWT_ALGORITHM)
            return decode_token if decode_token["expires"] >= time.time() else None
        except:
            print("ERROR: unable to decode token.")
            return None