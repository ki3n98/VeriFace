from __future__ import annotations

PAGE_WIDTH = 842
PAGE_HEIGHT = 595
MARGIN = 36
CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2)
BOTTOM = PAGE_HEIGHT - 42

STATUS_COLORS = {
    "present": (5, 150, 105),
    "late": (217, 119, 6),
    "absent": (220, 38, 38),
    "not_recorded": (100, 116, 139),
}

STATUS_LABELS = {
    "present": "Present",
    "late": "Late",
    "absent": "Absent",
    "not_recorded": "Not recorded",
}


class SimplePdf:
    def __init__(self) -> None:
        self.pages: list[list[str]] = []
        self.add_page()

    def add_page(self) -> None:
        self.pages.append([])

    @property
    def commands(self) -> list[str]:
        return self.pages[-1]

    def rect(
        self,
        x: float,
        top: float,
        width: float,
        height: float,
        fill: tuple[int, int, int] | None = None,
        stroke: tuple[int, int, int] | None = None,
    ) -> None:
        y = PAGE_HEIGHT - top - height
        if fill is not None:
            self.commands.append(f"{rgb(fill)} rg {x:.2f} {y:.2f} {width:.2f} {height:.2f} re f")
        if stroke is not None:
            self.commands.append(f"{rgb(stroke)} RG {x:.2f} {y:.2f} {width:.2f} {height:.2f} re S")

    def line(
        self,
        x1: float,
        top1: float,
        x2: float,
        top2: float,
        color: tuple[int, int, int] = (226, 232, 240),
    ) -> None:
        y1 = PAGE_HEIGHT - top1
        y2 = PAGE_HEIGHT - top2
        self.commands.append(f"{rgb(color)} RG {x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S")

    def text(
        self,
        x: float,
        top: float,
        value: str,
        size: int = 10,
        bold: bool = False,
        color: tuple[int, int, int] = (15, 23, 42),
    ) -> None:
        font = "F2" if bold else "F1"
        y = PAGE_HEIGHT - top
        self.commands.append(
            f"BT /{font} {size} Tf {rgb(color)} rg 1 0 0 1 {x:.2f} {y:.2f} Tm ({pdf_escape(value)}) Tj ET"
        )

    def build(self) -> bytes:
        objects: list[bytes] = []
        objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
        kids = " ".join(f"{5 + i * 2} 0 R" for i in range(len(self.pages)))
        objects.append(
            f"<< /Type /Pages /Kids [{kids}] /Count {len(self.pages)} >>".encode("latin-1")
        )
        objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
        objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

        for index, page in enumerate(self.pages):
            page_id = 5 + index * 2
            content_id = page_id + 1
            stream = "\n".join(page).encode("latin-1", "replace")
            objects.append(
                (
                    f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
                    f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> "
                    f"/Contents {content_id} 0 R >>"
                ).encode("latin-1")
            )
            objects.append(
                b"<< /Length "
                + str(len(stream)).encode("latin-1")
                + b" >>\nstream\n"
                + stream
                + b"\nendstream"
            )

        output = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
        offsets = [0]
        for number, obj in enumerate(objects, start=1):
            offsets.append(len(output))
            output += f"{number} 0 obj\n".encode("latin-1") + obj + b"\nendobj\n"

        xref_start = len(output)
        output += f"xref\n0 {len(objects) + 1}\n".encode("latin-1")
        output += b"0000000000 65535 f \n"
        for offset in offsets[1:]:
            output += f"{offset:010d} 00000 n \n".encode("latin-1")
        output += (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_start}\n%%EOF\n"
        ).encode("latin-1")
        return output


def render_attendance_report_pdf(report: dict) -> bytes:
    pdf = SimplePdf()
    state = {"y": 0}

    def start_page() -> None:
        state["y"] = 34
        pdf.rect(MARGIN, state["y"], CONTENT_WIDTH, 58, fill=(67, 56, 202))
        pdf.text(MARGIN + 20, state["y"] + 22, "VeriFace Attendance Report", 12, True, (226, 232, 240))
        pdf.text(MARGIN + 20, state["y"] + 44, report["event"]["name"], 24, True, (255, 255, 255))
        pdf.text(
            MARGIN + 500,
            state["y"] + 24,
            f"{len(report['sessions'])} sessions",
            10,
            True,
            (255, 255, 255),
        )
        pdf.text(
            MARGIN + 500,
            state["y"] + 42,
            f"{len(report['member_summaries'])} members",
            10,
            False,
            (226, 232, 240),
        )
        state["y"] += 82

    def ensure_space(height: float) -> None:
        if state["y"] + height <= BOTTOM:
            return
        draw_footer()
        pdf.add_page()
        start_page()

    def draw_footer() -> None:
        page_number = len(pdf.pages)
        pdf.line(MARGIN, PAGE_HEIGHT - 28, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 28)
        pdf.text(MARGIN, PAGE_HEIGHT - 16, "Generated by VeriFace", 8, False, (100, 116, 139))
        pdf.text(PAGE_WIDTH - MARGIN - 42, PAGE_HEIGHT - 16, f"Page {page_number}", 8, False, (100, 116, 139))

    def section_title(title: str, subtitle: str = "") -> None:
        ensure_space(38)
        pdf.text(MARGIN, state["y"] + 8, title, 15, True)
        if subtitle:
            pdf.text(MARGIN + 210, state["y"] + 8, subtitle, 9, False, (100, 116, 139))
        state["y"] += 22

    start_page()
    draw_kpis(pdf, report, state)

    aggregations = set(report["query"]["aggregations"])
    if "overall" in aggregations:
        draw_overall(pdf, report, state, ensure_space, section_title)
    if "sessions" in aggregations:
        draw_sessions(pdf, report, state, ensure_space, section_title)
    if "members" in aggregations:
        draw_members(pdf, report, state, ensure_space, section_title)
    if "matrix" in aggregations:
        draw_matrix(pdf, report, state, ensure_space, section_title)

    draw_footer()
    return pdf.build()


def draw_kpis(pdf: SimplePdf, report: dict, state: dict) -> None:
    overall = report["overall"]
    cards = [
        ("Attendance Rate", f"{overall['attendance_rate']}%", (67, 56, 202)),
        ("Present", str(overall["present"]), STATUS_COLORS["present"]),
        ("Late", str(overall["late"]), STATUS_COLORS["late"]),
        ("Absent", str(overall["absent"]), STATUS_COLORS["absent"]),
    ]
    gap = 12
    card_width = (CONTENT_WIDTH - (gap * 3)) / 4
    for index, (label, value, color) in enumerate(cards):
        x = MARGIN + index * (card_width + gap)
        pdf.rect(x, state["y"], card_width, 64, fill=(255, 255, 255), stroke=(203, 213, 225))
        pdf.text(x + 12, state["y"] + 19, label.upper(), 8, True, (100, 116, 139))
        pdf.text(x + 12, state["y"] + 48, value, 24, True, color)
    state["y"] += 84


def draw_overall(pdf, report, state, ensure_space, section_title) -> None:
    overall = report["overall"]
    section_title("Overall Summary", f"{overall['attended_slots']} attended slots of {overall['total_slots']}")
    rows = [
        ["Present", str(overall["present"]), "On-time check-ins"],
        ["Late", str(overall["late"]), "Late but attended"],
        ["Absent", str(overall["absent"]), "No qualifying check-in"],
        ["Not recorded", str(overall["not_recorded"]), "Missing attendance row"],
    ]
    draw_table(pdf, state, ensure_space, ["Metric", "Value", "Meaning"], rows, [180, 90, 480])


def draw_sessions(pdf, report, state, ensure_space, section_title) -> None:
    section_title("Session Breakdown", "Attendance by selected session")
    rows = [
        [
            row["label"],
            str(row["present"]),
            str(row["late"]),
            str(row["absent"]),
            str(row["not_recorded"]),
            f"{row['attendance_rate']}%",
        ]
        for row in report["session_summaries"]
    ]
    draw_table(
        pdf,
        state,
        ensure_space,
        ["Session", "Present", "Late", "Absent", "Not rec.", "Rate"],
        rows,
        [210, 95, 95, 95, 115, 100],
    )


def draw_members(pdf, report, state, ensure_space, section_title) -> None:
    section_title("Member Summary", "Aggregated by student")
    rows = [
        [
            row["name"],
            row["email"],
            str(row["present"]),
            str(row["late"]),
            str(row["absent"]),
            f"{row['attendance_rate']}%",
        ]
        for row in report["member_summaries"]
    ]
    draw_table(
        pdf,
        state,
        ensure_space,
        ["Student", "Email", "Present", "Late", "Absent", "Rate"],
        rows,
        [185, 245, 80, 70, 80, 80],
    )


def draw_matrix(pdf, report, state, ensure_space, section_title) -> None:
    section_title("Attendance Matrix", "Status by selected session")
    sessions = report["sessions"]
    session_count = max(len(sessions), 1)
    student_width = 170
    session_width = max(52, (CONTENT_WIDTH - student_width) / session_count)
    headers = ["Student", *[session["label"] for session in sessions]]
    widths = [student_width, *([session_width] * len(sessions))]
    rows = [
        [
            row["name"],
            *[STATUS_LABELS.get(cell["status"], str(cell["status"])) for cell in row["cells"]],
        ]
        for row in report["member_summaries"]
    ]
    draw_table(pdf, state, ensure_space, headers, rows, widths, status_columns=True)


def draw_table(
    pdf: SimplePdf,
    state: dict,
    ensure_space,
    headers: list[str],
    rows: list[list[str]],
    widths: list[float],
    status_columns: bool = False,
) -> None:
    row_height = 23
    header_height = 24
    total_width = min(sum(widths), CONTENT_WIDTH)

    def draw_header() -> None:
        ensure_space(header_height + row_height)
        pdf.rect(MARGIN, state["y"], total_width, header_height, fill=(241, 245, 249), stroke=(203, 213, 225))
        x = MARGIN
        for header, width in zip(headers, widths):
            pdf.text(x + 6, state["y"] + 16, truncate(header, max_chars(width)), 8, True, (51, 65, 85))
            x += width
        state["y"] += header_height

    draw_header()
    if not rows:
        pdf.text(MARGIN + 6, state["y"] + 16, "No matching rows", 9, False, (100, 116, 139))
        state["y"] += row_height + 10
        return

    for index, row in enumerate(rows):
        if state["y"] + row_height > BOTTOM:
            pdf.add_page()
            state["y"] = 34
            pdf.rect(MARGIN, state["y"], CONTENT_WIDTH, 58, fill=(67, 56, 202))
            pdf.text(MARGIN + 20, state["y"] + 35, "VeriFace Attendance Report", 18, True, (255, 255, 255))
            state["y"] += 82
            draw_header()

        fill = (255, 255, 255) if index % 2 == 0 else (248, 250, 252)
        pdf.rect(MARGIN, state["y"], total_width, row_height, fill=fill, stroke=(226, 232, 240))
        x = MARGIN
        for col_index, (value, width) in enumerate(zip(row, widths)):
            if status_columns and col_index > 0:
                draw_status_pill(pdf, x + 5, state["y"] + 5, value, width - 10)
            else:
                pdf.text(x + 6, state["y"] + 15, truncate(value, max_chars(width)), 8, col_index == 0)
            x += width
        state["y"] += row_height
    state["y"] += 14


def draw_status_pill(pdf: SimplePdf, x: float, top: float, value: str, width: float) -> None:
    normalized = value.lower().replace(" ", "_")
    color = STATUS_COLORS.get(normalized, STATUS_COLORS["not_recorded"])
    pill_width = min(max(width, 38), 82)
    pdf.rect(x, top, pill_width, 13, fill=color)
    pdf.text(x + 4, top + 10, truncate(value, max_chars(pill_width)), 6, True, (255, 255, 255))


def truncate(value: str, limit: int) -> str:
    if len(value) <= limit:
        return value
    return value[: max(0, limit - 3)] + "..."


def max_chars(width: float) -> int:
    return max(4, int(width / 5.3))


def rgb(color: tuple[int, int, int]) -> str:
    return " ".join(f"{channel / 255:.3f}" for channel in color)


def pdf_escape(value: str) -> str:
    normalized = str(value).encode("latin-1", "replace").decode("latin-1")
    return (
        normalized.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
        .replace("\r", " ")
        .replace("\n", " ")
    )
