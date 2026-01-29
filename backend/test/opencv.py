import cv2
import requests
import time
import json

# ==== CONFIGURE THESE ====
BASE_URL = "http://127.0.0.1"  # your FastAPI server URL
SESSION_ID = 21                      # session you want to check into
ATTEMPT_INTERVAL = 5                # seconds between automatic attempts
CAMERA_INDEX = 1                    # 0 = default webcam
# ==========================


def attempt_checkin(frame):
    """
    Encode the frame as JPEG and send to the backend check-in endpoint.
    Returns (success: bool, message: str).
    """
    # Encode frame as JPEG
    ok, jpeg = cv2.imencode(".jpg", frame)
    if not ok:
        return False, "Failed to encode frame as JPEG"

    file_bytes = jpeg.tobytes()

    url = f"{BASE_URL}/protected/sessions/{SESSION_ID}/checkin"

    files = {
        "upload_image": ("frame.jpg", file_bytes, "image/jpeg")
    }

    try:
        resp = requests.post(url, files=files, timeout=15)
    except Exception as e:
        return False, f"Request failed: {e}"

    if resp.status_code == 200:
        try:
            data = resp.json()
        except json.JSONDecodeError:
            return True, "Checked in (no JSON response)"

        user_id = data.get("user_id")
        similarity = data.get("similarity")
        if similarity is not None:
            return True, f"Checked in user {user_id} (sim={similarity:.3f})"
        return True, f"Checked in user {user_id}"

    # Non-200 → show backend error if any
    try:
        error = resp.json()
        detail = error.get("detail", resp.text)
    except json.JSONDecodeError:
        detail = resp.text

    return False, f"Error {resp.status_code}: {detail}"


def main():
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        print("Could not open webcam")
        return

    last_attempt = 0.0
    checked_in = False
    message = "Press 'q' to quit"

    print(
        "Starting webcam. Automatic check-ins every "
        f"{ATTEMPT_INTERVAL} seconds..."
    )

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to read frame from webcam")
            break

        # Show status text on the frame
        display_frame = frame.copy()
        cv2.putText(
            display_frame, message, (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA
        )
        cv2.imshow("Real-time Check-in", display_frame)

        now = time.time()

        # Try automatic check-in periodically until success
        if not checked_in and (now - last_attempt) >= ATTEMPT_INTERVAL:
            last_attempt = now
            print("Attempting check-in...")
            success, msg = attempt_checkin(frame)
            print(msg)
            message = msg

            if success:
                checked_in = True
                # Optional: break after first success instead
                # break

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            print("Quitting.")
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
