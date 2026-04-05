/**
 * API times: check-in is stored in Postgres as UTC; responses use ISO with Z.
 * Display in America/Los_Angeles (PST/PDT) for consistency.
 */

const ISO_NAIVE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?$/;

export function parseBackendUtc(iso: string): Date {
  const t = iso.trim();
  if (ISO_NAIVE.test(t)) {
    return new Date(`${t}Z`);
  }
  return new Date(t);
}

export function formatPacificTime(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "—";
  const d = parseBackendUtc(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/** Session start times: hour and minute only, still in America/Los_Angeles. */
export function formatPacificClock(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "Not set";
  const d = parseBackendUtc(iso);
  if (Number.isNaN(d.getTime())) return "Not set";
  return d.toLocaleTimeString("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatPacificDateTime(
  iso: string | null | undefined,
  fallback = "—",
): string {
  if (iso == null || iso === "") return fallback;
  const d = parseBackendUtc(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
