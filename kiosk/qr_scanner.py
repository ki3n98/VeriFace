import cv2
from config import CAMERA_INDEX, CAMERA_BACKEND, QR_SCAN_WINDOW_NAME


def scan_for_session_id() -> int:
    """
    Opens camera, scans for a QR code containing a session ID integer.
    Returns the session_id once detected. Blocks until a valid QR is found
    or the user presses 'q' to quit (raises SystemExit).
    """
    cap = cv2.VideoCapture(CAMERA_INDEX, CAMERA_BACKEND)
    detector = cv2.QRCodeDetector()

    if not cap.isOpened():
        raise RuntimeError("Cannot open camera")

    print("Waiting for QR code... (press 'q' to quit)")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                continue

            data, bbox, _ = detector.detectAndDecode(frame)

            if bbox is not None and data:
                # Draw bounding box around detected QR code
                bbox_int = bbox[0].astype(int)
                for i in range(len(bbox_int)):
                    pt1 = tuple(bbox_int[i])
                    pt2 = tuple(bbox_int[(i + 1) % len(bbox_int)])
                    cv2.line(frame, pt1, pt2, (0, 255, 0), 2)

                # Validate: must be a plain integer
                try:
                    session_id = int(data.strip())
                    cv2.putText(
                        frame,
                        f"Session ID: {session_id}",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 255, 0),
                        2,
                    )
                    cv2.imshow(QR_SCAN_WINDOW_NAME, frame)
                    cv2.waitKey(500)  # Brief pause to show success
                    return session_id
                except ValueError:
                    cv2.putText(
                        frame,
                        "Invalid QR (not a session ID)",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (0, 0, 255),
                        2,
                    )

            cv2.imshow(QR_SCAN_WINDOW_NAME, frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                raise SystemExit("User quit")
    finally:
        cap.release()
        cv2.destroyWindow(QR_SCAN_WINDOW_NAME)
