from datetime import datetime, timezone
from io import StringIO

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.attendance import Attendance
from app.db.models.event import Event
from app.db.models.event_user import EventUser
from app.db.models.session import Session as EventSession
from app.db.models.user import User
from app.db.schema.report import AttendanceReportRequest


STATUS_LABELS = {
    "present": "Present",
    "late": "Late",
    "absent": "Absent",
    "not_recorded": "Not recorded",
}


class AttendanceReportService:
    def __init__(self, session: Session):
        self.session = session

    def build_event_report(self, request: AttendanceReportRequest) -> dict:
        event = self.session.get(Event, request.event_id)
        if event is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Event with id={request.event_id} not found.",
            )

        all_sessions = (
            self.session.query(EventSession)
            .filter(EventSession.event_id == request.event_id)
            .order_by(EventSession.sequence_number)
            .all()
        )
        selected_sessions = self.__select_sessions(all_sessions, request)
        members = self.__get_event_members(event)
        attendance_by_key = self.__get_attendance_by_key(selected_sessions)

        member_rows = [
            self.__build_member_row(member, selected_sessions, attendance_by_key)
            for member in members
        ]
        selected_statuses = set(request.statuses)
        if not request.include_all_members:
            member_rows = [
                row
                for row in member_rows
                if any(cell["status"] in selected_statuses for cell in row["cells"])
            ]

        session_summaries = self.__build_session_summaries(
            selected_sessions, member_rows
        )
        overall = self.__build_overall_summary(member_rows)

        return {
            "event": {
                "id": event.id,
                "name": event.event_name or f"Event {event.id}",
                "location": event.location,
            },
            "generated_at": datetime.now(timezone.utc),
            "query": {
                "session_scope": request.session_scope,
                "session_ids": [session.id for session in selected_sessions],
                "statuses": request.statuses,
                "aggregations": request.aggregations,
                "include_all_members": request.include_all_members,
            },
            "sessions": [
                {
                    "id": session.id,
                    "sequence_number": session.sequence_number,
                    "label": f"Session {session.sequence_number}",
                    "start_time": session.start_time,
                }
                for session in selected_sessions
            ],
            "overall": overall,
            "session_summaries": session_summaries,
            "member_summaries": member_rows,
        }

    def render_csv(self, report: dict) -> str:
        lines: list[str] = []
        aggregations = set(report["query"]["aggregations"])

        def add_section(title: str, rows: list[list[str]]) -> None:
            if lines:
                lines.append("")
            lines.append(title)
            for row in rows:
                lines.append(",".join(self.__escape_csv(str(value)) for value in row))

        if "overall" in aggregations:
            overall = report["overall"]
            add_section(
                "Overall Summary",
                [
                    ["Metric", "Value"],
                    ["Event", report["event"]["name"]],
                    ["Generated", self.__format_datetime(report["generated_at"])],
                    ["Sessions", str(len(report["sessions"]))],
                    ["Members", str(len(report["member_summaries"]))],
                    ["Present", str(overall["present"])],
                    ["Late", str(overall["late"])],
                    ["Absent", str(overall["absent"])],
                    ["Not Recorded", str(overall["not_recorded"])],
                    ["Attendance Rate", f"{overall['attendance_rate']}%"],
                ],
            )

        if "sessions" in aggregations:
            add_section(
                "Session Breakdown",
                [
                    [
                        "Session",
                        "Present",
                        "Late",
                        "Absent",
                        "Not Recorded",
                        "Total",
                        "Attendance Rate",
                    ],
                    *[
                        [
                            row["label"],
                            str(row["present"]),
                            str(row["late"]),
                            str(row["absent"]),
                            str(row["not_recorded"]),
                            str(row["total"]),
                            f"{row['attendance_rate']}%",
                        ]
                        for row in report["session_summaries"]
                    ],
                ],
            )

        if "members" in aggregations:
            add_section(
                "Member Summary",
                [
                    [
                        "Student Name",
                        "Student ID",
                        "Email",
                        "Present",
                        "Late",
                        "Absent",
                        "Not Recorded",
                        "Attendance Rate",
                    ],
                    *[
                        [
                            row["name"],
                            row["student_id"],
                            row["email"],
                            str(row["present"]),
                            str(row["late"]),
                            str(row["absent"]),
                            str(row["not_recorded"]),
                            f"{row['attendance_rate']}%",
                        ]
                        for row in report["member_summaries"]
                    ],
                ],
            )

        if "matrix" in aggregations:
            add_section(
                "Attendance Matrix",
                [
                    [
                        "Student Name",
                        "Student ID",
                        "Email",
                        *[session["label"] for session in report["sessions"]],
                    ],
                    *[
                        [
                            row["name"],
                            row["student_id"],
                            row["email"],
                            *[
                                STATUS_LABELS.get(cell["status"], str(cell["status"]))
                                for cell in row["cells"]
                            ],
                        ]
                        for row in report["member_summaries"]
                    ],
                ],
            )

        return "\n".join(lines)

    def get_filename(self, report: dict, extension: str) -> str:
        date = report["generated_at"].strftime("%Y-%m-%d")
        return f"attendance-report-{report['event']['id']}-{date}.{extension}"

    def __select_sessions(
        self,
        all_sessions: list[EventSession],
        request: AttendanceReportRequest,
    ) -> list[EventSession]:
        if request.session_scope == "latest":
            return all_sessions[-1:] if all_sessions else []

        if request.session_scope == "custom":
            if not request.session_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="session_ids is required when session_scope is custom.",
                )
            requested_ids = set(request.session_ids)
            event_session_ids = {session.id for session in all_sessions}
            invalid_ids = requested_ids - event_session_ids
            if invalid_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Sessions do not belong to this event: {sorted(invalid_ids)}",
                )
            return [session for session in all_sessions if session.id in requested_ids]

        return all_sessions

    def __get_event_members(self, event: Event) -> list:
        return (
            self.session.query(User)
            .join(EventUser, User.id == EventUser.user_id)
            .filter(EventUser.event_id == event.id)
            .filter(User.id != event.user_id)
            .order_by(User.last_name, User.first_name, User.id)
            .all()
        )

    def __get_attendance_by_key(
        self, selected_sessions: list[EventSession]
    ) -> dict[tuple[int, int], Attendance]:
        session_ids = [session.id for session in selected_sessions]
        if not session_ids:
            return {}

        rows = (
            self.session.query(Attendance)
            .filter(Attendance.session_id.in_(session_ids))
            .all()
        )
        return {(row.session_id, row.user_id): row for row in rows}

    def __build_member_row(
        self,
        member: User,
        selected_sessions: list[EventSession],
        attendance_by_key: dict[tuple[int, int], Attendance],
    ) -> dict:
        cells = []
        for session in selected_sessions:
            record = attendance_by_key.get((session.id, member.id))
            status_value = (
                self.__status_value(record.status) if record is not None else "not_recorded"
            )
            cells.append(
                {
                    "session_id": session.id,
                    "label": f"Session {session.sequence_number}",
                    "status": status_value,
                    "check_in_time": (
                        self.__format_datetime(record.check_in_time)
                        if record and record.check_in_time
                        else ""
                    ),
                }
            )

        counts = self.__count_cells(cells)
        total_sessions = len(selected_sessions)
        attended = counts["present"] + counts["late"]
        attendance_rate = (
            round((attended / total_sessions) * 100, 1)
            if total_sessions > 0
            else 0.0
        )

        return {
            "user_id": member.id,
            "name": f"{member.first_name or ''} {member.last_name or ''}".strip(),
            "student_id": self.__format_student_id(member.id),
            "email": member.email,
            "present": counts["present"],
            "late": counts["late"],
            "absent": counts["absent"],
            "not_recorded": counts["not_recorded"],
            "attendance_rate": attendance_rate,
            "cells": cells,
        }

    def __build_session_summaries(
        self, selected_sessions: list[EventSession], member_rows: list[dict]
    ) -> list[dict]:
        summaries = []
        for session in selected_sessions:
            cells = [
                cell
                for member in member_rows
                for cell in member["cells"]
                if cell["session_id"] == session.id
            ]
            counts = self.__count_cells(cells)
            total = len(member_rows)
            attended = counts["present"] + counts["late"]
            summaries.append(
                {
                    "session_id": session.id,
                    "label": f"Session {session.sequence_number}",
                    "present": counts["present"],
                    "late": counts["late"],
                    "absent": counts["absent"],
                    "not_recorded": counts["not_recorded"],
                    "total": total,
                    "attendance_rate": round((attended / total) * 100, 1)
                    if total > 0
                    else 0.0,
                }
            )
        return summaries

    def __build_overall_summary(self, member_rows: list[dict]) -> dict:
        cells = [cell for row in member_rows for cell in row["cells"]]
        counts = self.__count_cells(cells)
        total_slots = len(cells)
        attended = counts["present"] + counts["late"]
        return {
            "present": counts["present"],
            "late": counts["late"],
            "absent": counts["absent"],
            "not_recorded": counts["not_recorded"],
            "total_slots": total_slots,
            "attended_slots": attended,
            "attendance_rate": round((attended / total_slots) * 100, 1)
            if total_slots > 0
            else 0.0,
        }

    def __count_cells(self, cells: list[dict]) -> dict[str, int]:
        counts = {"present": 0, "late": 0, "absent": 0, "not_recorded": 0}
        for cell in cells:
            status_value = cell["status"]
            if status_value in counts:
                counts[status_value] += 1
        return counts

    def __status_value(self, value) -> str:
        return value.value if hasattr(value, "value") else str(value)

    def __format_student_id(self, user_id: int) -> str:
        return f"STU-2024-{str(user_id).zfill(3)}"

    def __format_datetime(self, value: datetime) -> str:
        hour = value.strftime("%I").lstrip("0") or "0"
        return f"{value.strftime('%b')} {value.day}, {value.year} {hour}:{value.strftime('%M %p')}"

    def __escape_csv(self, value: str) -> str:
        output = StringIO()
        if "," in value or '"' in value or "\n" in value:
            output.write('"')
            output.write(value.replace('"', '""'))
            output.write('"')
            return output.getvalue()
        return value
