from typing import Literal

from pydantic import BaseModel, Field, field_validator


ReportFormat = Literal["pdf", "csv"]
ReportSessionScope = Literal["all", "latest", "custom"]
ReportStatus = Literal["present", "late", "absent"]
ReportAggregation = Literal["overall", "sessions", "members", "matrix"]


class AttendanceReportRequest(BaseModel):
    event_id: int
    format: ReportFormat = "pdf"
    session_scope: ReportSessionScope = "all"
    session_ids: list[int] = Field(default_factory=list)
    statuses: list[ReportStatus] = Field(
        default_factory=lambda: ["present", "late", "absent"]
    )
    aggregations: list[ReportAggregation] = Field(
        default_factory=lambda: ["overall", "sessions", "members", "matrix"]
    )
    include_all_members: bool = True

    @field_validator("statuses")
    @classmethod
    def validate_statuses(cls, value: list[ReportStatus]) -> list[ReportStatus]:
        return value or ["present", "late", "absent"]

    @field_validator("aggregations")
    @classmethod
    def validate_aggregations(
        cls, value: list[ReportAggregation]
    ) -> list[ReportAggregation]:
        return value or ["overall", "sessions", "members", "matrix"]
