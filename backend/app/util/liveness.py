from __future__ import annotations

from dataclasses import dataclass
from secrets import token_urlsafe
from time import time

from fastapi import HTTPException, status


LIVENESS_ACTIONS = {
    "blink": "Blink once",
}
CHALLENGE_TTL_SECONDS = 20


@dataclass
class LivenessChallenge:
    session_id: int
    action: str
    expires_at: float


class LivenessChallengeStore:
    def __init__(self) -> None:
        self.__challenges: dict[str, LivenessChallenge] = {}

    def create(self, session_id: int) -> dict:
        self.__remove_expired()
        action = "blink"
        token = token_urlsafe(24)
        self.__challenges[token] = LivenessChallenge(
            session_id=session_id,
            action=action,
            expires_at=time() + CHALLENGE_TTL_SECONDS,
        )
        return {
            "token": token,
            "action": action,
            "prompt": LIVENESS_ACTIONS[action],
            "expires_in": CHALLENGE_TTL_SECONDS,
        }

    def verify(self, token: str | None, session_id: int, action: str | None) -> None:
        self.__remove_expired()
        if not token or not action:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Live face verification is required before check-in.",
            )

        challenge = self.__challenges.pop(token, None)
        if challenge is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Live face verification expired. Please try again.",
            )

        if challenge.session_id != session_id or challenge.action != action:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Live face verification did not match this check-in.",
            )

    def __remove_expired(self) -> None:
        now = time()
        expired_tokens = [
            token
            for token, challenge in self.__challenges.items()
            if challenge.expires_at <= now
        ]
        for token in expired_tokens:
            self.__challenges.pop(token, None)


liveness_store = LivenessChallengeStore()
