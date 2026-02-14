import cv2
import requests
from config import CHECKIN_ENDPOINT, CAMERA_INDEX, CHECKIN_WINDOW_NAME


def run_checkin_loop(session_id: int) -> None:
    """
    Opens camera for face check-in. Users press SPACE to capture a photo,
    which is sent to the check-in API. Press 'q' to return to QR scanning.
    """
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        raise RuntimeError("Cannot open camera")

    print(f"Check-in mode for session {session_id}")
    print("Press SPACE to capture face, 'q' to go back to QR scan")

    status_text = "Press SPACE to check in"
    status_color = (255, 255, 255)

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                continue

            # Draw status overlay
            display = frame.copy()
            cv2.putText(
                display,
                f"Session: {session_id}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 0),
                2,
            )
            cv2.putText(
                display,
                status_text,
                (10, 70),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                status_color,
                2,
            )

            cv2.imshow(CHECKIN_WINDOW_NAME, display)

            key = cv2.waitKey(1) & 0xFF

            if key == ord("q"):
                break
            elif key == ord(" "):
                # Show processing state
                processing = frame.copy()
                cv2.putText(
                    processing,
                    "Processing...",
                    (10, 70),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 255),
                    2,
                )
                cv2.imshow(CHECKIN_WINDOW_NAME, processing)
                cv2.waitKey(1)

                result = _send_checkin(frame, session_id)

                if result.get("success"):
                    name = result.get("name", "Unknown")
                    sim = result.get("similarity", 0)
                    status_text = f"Checked in: {name} ({sim:.2f})"
                    status_color = (0, 255, 0)
                else:
                    status_text = f"Failed: {result.get('error', 'Unknown error')}"
                    status_color = (0, 0, 255)
    finally:
        cap.release()
        cv2.destroyWindow(CHECKIN_WINDOW_NAME)


def _send_checkin(frame, session_id: int) -> dict:
    """Encode frame as JPEG and POST to the check-in endpoint."""
    try:
        success, buffer = cv2.imencode(".jpg", frame)
        if not success:
            return {"success": False, "error": "Failed to encode image"}

        files = {
            "upload_image": ("face.jpg", buffer.tobytes(), "image/jpeg"),
        }
        params = {"session_id": session_id}

        response = requests.post(
            CHECKIN_ENDPOINT,
            params=params,
            files=files,
            timeout=10,
        )

        if response.ok:
            data = response.json()
            return {
                "success": True,
                "name": data.get("name"),
                "similarity": data.get("similarity"),
                "status": data.get("status"),
            }
        else:
            detail = response.json().get("detail", response.text)
            return {"success": False, "error": detail}

    except requests.RequestException as e:
        return {"success": False, "error": str(e)}
