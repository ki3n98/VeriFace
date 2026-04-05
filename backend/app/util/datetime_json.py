"""JSON datetime helpers.

- Attendance ``check_in_time``: naive values are UTC wall clock (Postgres without tz).
- Session ``start_time`` / ``end_time``: naive values are America/Los_Angeles wall
  clock (see ``sessionService.create_session``).
"""

from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def utc_iso_z(dt: datetime | None) -> str | None:
    """Serialize a datetime as ISO-8601 UTC with Z (never ambiguous local)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt_utc = dt.replace(tzinfo=timezone.utc)
    else:
        dt_utc = dt.astimezone(timezone.utc)
    s = dt_utc.isoformat(timespec="seconds")
    if s.endswith("+00:00"):
        return s[:-6] + "Z"
    return s


def session_instant_to_utc_iso_z(dt: datetime | None) -> str | None:
    """Serialize session start/end: naive DB values = Pacific wall clock → UTC ``Z``."""
    if dt is None:
        return None
    la = ZoneInfo("America/Los_Angeles")
    if dt.tzinfo is None:
        localized = dt.replace(tzinfo=la)
    else:
        localized = dt.astimezone(la)
    return utc_iso_z(localized.astimezone(timezone.utc))
