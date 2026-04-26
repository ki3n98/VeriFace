from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from app.db.schema.user import UserOutput
from app.db.schema.session import SessionInCreate, SessionOutput
from app.db.schema.attendance import AttendanceWithUser, UpdateAttendanceStatusRequest
from app.db.schema.report import AttendanceReportRequest
from app.service.sessionService import SessionService
from app.service.attendantService import AttendanceService
from app.service.reportService import AttendanceReportService
from app.core.database import get_db
from app.util.protectRoute import get_current_user
from app.util.permission import check_permission
from app.db.models.session import Session as SessionModel
from app.db.models.user import User
from app.service.eventAuditService import try_log_event_action
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, Response, status, UploadFile, File, WebSocket, WebSocketDisconnect
from app.util.embeddings import upload_img_to_embedding
from app.util.datetime_json import utc_iso_z
from app.util.pdf_report import render_attendance_report_pdf
from app.util.ws_manager import manager


class SessionIdRequest(BaseModel):
    session_id: int


class EventIdRequest(BaseModel):
    event_id: int


class UpdateSessionStartTimeRequest(BaseModel):
    session_id: int
    start_time: Optional[datetime] = None


sessionRouter = APIRouter()

@sessionRouter.post("/createSession")
async def create_session_attendance(
    session_data : SessionInCreate, 
    user: UserOutput = Depends(get_current_user), 
    session: Session = Depends(get_db)
    ) -> dict:
    try:
        if not check_permission(
            user_id=user.id, 
            event_id=session_data.event_id,
            session=session,
            required_role="moderator",
            ):
        
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to modify event.")
        
        #create session
        event_session = SessionService(session=session).create_session(session_data=session_data)

        #create attendance
        AttendanceService(session=session).add_users_for_session(session_id=event_session.id)

        return {
            "success": True,
            "session": SessionOutput.model_validate(event_session, from_attributes=True)
        }
        
    
    except Exception as error:
        print(error)
        raise error



@sessionRouter.post("/updateSessionStartTime")
async def update_session_start_time(
    body: UpdateSessionStartTimeRequest,
    user: UserOutput = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Update a session's start time. Used to determine present vs late at check-in."""
    try:
        session_obj = (
            db.query(SessionModel)
            .filter(SessionModel.id == body.session_id)
            .one_or_none()
        )
        if session_obj is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session with id={body.session_id} not found.",
            )
        if not check_permission(
            user_id=user.id,
            event_id=session_obj.event_id,
            session=db,
            required_role="moderator",
        ):
            raise HTTPException(
                status_code=401,
                detail="Current user does not have permission to modify this session.",
            )
        previous_start = session_obj.start_time
        session_obj.start_time = body.start_time
        db.commit()
        db.refresh(session_obj)

        def _fmt_dt(dt: datetime | None) -> str:
            if dt is None:
                return "not set"
            return dt.isoformat(timespec="minutes")

        try_log_event_action(
            db,
            event_id=session_obj.event_id,
            actor_user_id=user.id,
            action="session_start_time_changed",
            category="update",
            message=(
                f"Changed session {session_obj.sequence_number} start time from "
                f"{_fmt_dt(previous_start)} to {_fmt_dt(session_obj.start_time)}"
            ),
            details={
                "session_id": session_obj.id,
                "sequence_number": session_obj.sequence_number,
                "previous": _fmt_dt(previous_start),
                "new": _fmt_dt(session_obj.start_time),
            },
        )
        return {
            "success": True,
            "session": SessionOutput.model_validate(session_obj, from_attributes=True),
        }
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise


@sessionRouter.post("/getMyAttendance")
async def get_my_attendance(
    body: EventIdRequest,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> dict:
    """Return the current user's attendance across all sessions of an event."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=body.event_id,
            session=session,
            required_role="member",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to view this event.",
            )

        result = AttendanceService(session=session).get_user_attendance_for_event(
            user_id=user.id, event_id=body.event_id
        )
        return {"success": True, **result}
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise error


@sessionRouter.post("/getSessions")
async def get_sessions(
    session_data: SessionInCreate,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> dict:
    try:
        if not check_permission(
            user_id=user.id,
            event_id=session_data.event_id,
            session=session,
            required_role="viewer",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to view event sessions.",
            )

        sessions = SessionService(session=session).get_sessions_by_event_id(
            event_id=session_data.event_id
        )

        return {
            "success": True,
            "sessions": [
                SessionOutput.model_validate(s, from_attributes=True) for s in sessions
            ],
        }
    except Exception as error:
        print(error)
        raise error


@sessionRouter.post("/getEventAttendanceOverview")
async def get_event_attendance_overview(
    body: EventIdRequest,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> dict:
    """Return attendance aggregates for an event (per session and overall) for Overview charts."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=body.event_id,
            session=session,
            required_role="viewer",
        ):
            raise HTTPException(
                status_code=401,
                detail="Current user does not have permission to view this event.",
            )

        result = AttendanceService(session=session).get_event_attendance_overview(
            event_id=body.event_id
        )
        return {"success": True, **result}
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise


@sessionRouter.post("/exportReport")
async def export_attendance_report(
    body: AttendanceReportRequest,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> Response:
    """Generate an attendance report file for the selected event and query."""
    try:
        if not check_permission(
            user_id=user.id,
            event_id=body.event_id,
            session=session,
            required_role="viewer",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to export this event.",
            )

        service = AttendanceReportService(session=session)
        report = service.build_event_report(body)

        if body.format == "csv":
            content = service.render_csv(report).encode("utf-8")
            media_type = "text/csv; charset=utf-8"
            filename = service.get_filename(report, "csv")
        else:
            content = render_attendance_report_pdf(report)
            media_type = "application/pdf"
            filename = service.get_filename(report, "pdf")

        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Report-Filename": filename,
            },
        )
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise


@sessionRouter.post("/getAttendance")
async def get_attendance(
    body: SessionIdRequest,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> dict:
    try:
        # Look up the session to get event_id for permission check
        session_obj = (
            session.query(SessionModel)
            .filter(SessionModel.id == body.session_id)
            .one_or_none()
        )
        if session_obj is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session with id={body.session_id} not found.",
            )

        if not check_permission(
            user_id=user.id,
            event_id=session_obj.event_id,
            session=session,
            required_role="viewer",
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Current user does not have permission to view this session.",
            )

        result = AttendanceService(session=session).get_session_attendance(
            session_id=body.session_id
        )

        return {
            "success": True,
            "attendance": [
                AttendanceWithUser.model_validate(a) for a in result["attendance"]
            ],
            "summary": result["summary"],
        }
    except Exception as error:
        print(error)
        raise error


@sessionRouter.post("/updateAttendanceStatus")
async def update_attendance_status(
    body: UpdateAttendanceStatusRequest,
    user: UserOutput = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> dict:
    """Manually update a user's attendance status (present, late, absent)."""
    try:
        session_obj = (
            session.query(SessionModel)
            .filter(SessionModel.id == body.session_id)
            .one_or_none()
        )
        if session_obj is None:
            raise HTTPException(
                status_code=404,
                detail=f"Session with id={body.session_id} not found.",
            )

        if not check_permission(
            user_id=user.id,
            event_id=session_obj.event_id,
            session=session,
            required_role="moderator",
        ):
            raise HTTPException(
                status_code=401,
                detail="Current user does not have permission to update attendance.",
            )

        member_user = (
            session.query(User).filter(User.id == body.user_id).one_or_none()
        )
        member_label = (
            f"{member_user.first_name} {member_user.last_name}".strip()
            if member_user
            else f"User #{body.user_id}"
        )

        result = AttendanceService(session=session).update_attendance_status(
            user_id=body.user_id,
            session_id=body.session_id,
            status=body.status,
        )
        try_log_event_action(
            session,
            event_id=session_obj.event_id,
            actor_user_id=user.id,
            action="attendance_status_changed",
            category="update",
            message=(
                f"Set {member_label}'s attendance to {result['status']} "
                f"(was {result.get('previous_status')}) in session "
                f"{session_obj.sequence_number}"
            ),
            details={
                "session_id": body.session_id,
                "sequence_number": session_obj.sequence_number,
                "user_id": body.user_id,
                "previous_status": result.get("previous_status"),
                "new_status": result["status"],
            },
        )
        return {"success": True, **result}
    except HTTPException:
        raise
    except Exception as error:
        print(error)
        raise


@sessionRouter.post("/checkin")
async def check_in_with_face(
    session_id: int,
    upload_image: UploadFile = File(...),
    session: Session = Depends(get_db),
):
    try:
        # Convert image -> face embedding (ensures 1 face, size, etc.)
        
        embs = await upload_img_to_embedding(upload_image)
    except Exception as error:
            print(error)
            raise error 

    service = AttendanceService(session=session)
    results = {}
    total_embs = len(embs)
    checkedin_embs = 0
    already_checked_in_embs = 0
    last_error = None
    for i in range(total_embs):
        try:
            emb = [float(x) for x in embs[i]]
            result = service.check_in_with_embedding(session_id=session_id, face_embedding=emb)
            results[i] = {"success": True, "data": result}
            if result.get("attendance_updated"):
                checkedin_embs += 1
            elif result.get("already_checked_in"):
                already_checked_in_embs += 1

            # Only broadcast to dashboard if this changed attendance state
            if result.get("attendance_updated"):
                ws_data = {**result}
                if ws_data.get("check_in_time") is not None:
                    ct = ws_data["check_in_time"]
                    ws_data["check_in_time"] = (
                        utc_iso_z(ct) if isinstance(ct, datetime) else str(ct)
                    )
                await manager.broadcast_to_session(session_id, {
                    "type": "checkin",
                    "data": ws_data
                })
        except Exception as error:
            results[i] = {"success": False, "error": str(error)}
            last_error = error

    # If every face failed, surface the actual error instead of returning 200
    if checkedin_embs == 0 and already_checked_in_embs == 0 and last_error is not None:
        raise last_error

    return {
        "stats": {
            "num_face": total_embs,
            "checked_in": checkedin_embs,
            "already_checked_in": already_checked_in_embs,
            "matched": checkedin_embs + already_checked_in_embs,
        },
        "result": results,
    }

@sessionRouter.post('/camera')
def turn_on_camera(session_id:int
):
    return """
<!doctype html>
<html>
  <body>
    <h2>Camera + Model</h2>

    <video id="v" autoplay playsinline style="width:100%;max-width:480px;"></video>
    <br><br>

    <button id="captureBtn">Check In</button>

    <pre id="out"></pre>

    <script>
      const v = document.getElementById('v');
      const out = document.getElementById('out');
      const btn = document.getElementById('captureBtn');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      async function start() {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false
        });
        v.srcObject = stream;

        v.onloadedmetadata = () => {
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
        };
      }

      async function captureAndSend() {
        if (!canvas.width) return;

        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.7));

        const fd = new FormData();
        fd.append("upload_image", blob, "frame.jpg");

        try {
          const res = await fetch(`https://shayna-unswabbed-baroquely.ngrok-free.dev/protected/session/checkin?session_id=__SID__`, {
           method: "POST",
           headers: {
             "Authorization": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMTk1LCJleHBpcmVzIjoxNzcyMDc1NDM0LjMyMDg3ODd9.21gCOmB8zqiCD--gwe8okhPOQzfBCspzvh9JoRItlaw"
          },
          body: fd
          });

          const data = await res.json();
          out.textContent = JSON.stringify(data, null, 2);
        } catch (err) {
          out.textContent = err.toString();
        }
      }

      btn.addEventListener("click", captureAndSend);

      start().catch(e => out.textContent = e.toString());
    </script>
  </body>
</html>
""".replace("__SID__",str(session_id))


        
    

