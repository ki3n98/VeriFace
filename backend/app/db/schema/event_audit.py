from typing import Any, Optional

from pydantic import BaseModel


class AuditLogEntryOutput(BaseModel):
    id: int
    event_id: int
    actor_user_id: int
    actor_name: str
    action: str
    category: str
    message: str
    details: Optional[dict[str, Any]] = None
    created_at: Optional[str] = None


class GetAuditLogResponse(BaseModel):
    success: bool
    entries: list[AuditLogEntryOutput]
    has_more: bool = False
