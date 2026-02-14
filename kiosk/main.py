from qr_scanner import scan_for_session_id
from checkin_client import run_checkin_loop
from cv2_enumerate_cameras import enumerate_cameras

import cv2


def main():
    """
    Main loop: scan QR -> face check-in -> repeat.
    The kiosk alternates between QR scanning and check-in mode.
    """
    print("=== VeriFace Kiosk ===")

    while True:
        try:
            # Mode 1: Scan QR code to get session_id
            session_id = scan_for_session_id()
            print(f"QR code detected! Session ID: {session_id}")

            # Mode 2: Face check-in loop
            run_checkin_loop(session_id)
            print("Returning to QR scan mode...")

        except SystemExit:
            print("Kiosk shutting down.")
            break
        except Exception as e:
            print(f"Error: {e}")
            print("Returning to QR scan mode...")


def list_camera():
        for camera_info in enumerate_cameras():
            print(f"Index: {camera_info.index}, Name: {camera_info.name}, Path: {camera_info.path}")


if __name__ == "__main__":
    main()


