import time

import cv2

API_BASE_URL = "http://localhost:80"
CHECKIN_ENDPOINT = f"{API_BASE_URL}/protected/session/checkin"
CAMERA_INDEX = 0  # device index
CAMERA_BACKEND = cv2.CAP_ANY  # let OpenCV auto-detect backend
QR_SCAN_WINDOW_NAME = "VeriFace Kiosk - Scan QR Code"
CHECKIN_WINDOW_NAME = "VeriFace Kiosk - Face Check-In"
WINDOW_WIDTH = 480
WINDOW_HEIGHT = 360


def warmup_camera(cap: cv2.VideoCapture, duration: float = 1.5) -> None:
    """Read and discard frames to let the webcam sensor initialize."""
    end = time.monotonic() + duration
    while time.monotonic() < end:
        cap.read()
        time.sleep(0.03)
