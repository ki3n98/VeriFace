export type EventRole = "owner" | "admin" | "moderator" | "viewer" | "member";

export const ALL_ASSIGNABLE_ROLES: EventRole[] = [
  "admin",
  "moderator",
  "viewer",
  "member",
];

export function isEventRole(value: string | null | undefined): value is EventRole {
  return value === "owner"
    || value === "admin"
    || value === "moderator"
    || value === "viewer"
    || value === "member";
}

export function getRoleLabel(role: EventRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "moderator":
      return "Moderator";
    case "viewer":
      return "Viewer";
    case "member":
      return "Member";
  }
}

export function getRoleBadgeClass(role: EventRole): string {
  switch (role) {
    case "owner":
      return "bg-purple-700";
    case "admin":
      return "bg-blue-600";
    case "moderator":
      return "bg-teal-600";
    case "viewer":
      return "bg-slate-600";
    case "member":
      return "bg-green-600";
  }
}

export function getRoleColor(role: EventRole): string {
  switch (role) {
    case "owner":
      return "#6d28d9";
    case "admin":
      return "#2563eb";
    case "moderator":
      return "#0d9488";
    case "viewer":
      return "#475569";
    case "member":
      return "#16a34a";
  }
}

export function getRoleSoftBadgeClass(role: EventRole): string {
  switch (role) {
    case "owner":
      return "bg-purple-100 text-purple-700";
    case "admin":
      return "bg-blue-100 text-blue-700";
    case "moderator":
      return "bg-teal-100 text-teal-700";
    case "viewer":
      return "bg-slate-100 text-slate-700";
    case "member":
      return "bg-green-100 text-green-700";
  }
}

export function canViewAnalytics(role: EventRole | null | undefined): boolean {
  return role !== null && role !== undefined && role !== "member";
}

export function canManageSessions(role: EventRole | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "moderator";
}

export function canAddMembers(role: EventRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canRemoveMembers(role: EventRole | null | undefined): boolean {
  return role === "owner";
}

export function canAssignRoles(role: EventRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canEditDefaults(role: EventRole | null | undefined): boolean {
  return role === "owner";
}

export function canAccessParticipation(role: EventRole | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "moderator";
}

export function canManageBreakouts(role: EventRole | null | undefined): boolean {
  return canManageSessions(role);
}

export function getAssignableRolesForActor(role: EventRole | null | undefined): EventRole[] {
  if (role === "owner") {
    return ALL_ASSIGNABLE_ROLES;
  }
  if (role === "admin") {
    return ["moderator", "viewer", "member"];
  }
  return [];
}

export function canEditTargetRole(
  actorRole: EventRole | null | undefined,
  targetRole: EventRole,
): boolean {
  if (actorRole === "owner") {
    return targetRole !== "owner";
  }
  if (actorRole === "admin") {
    return targetRole === "moderator" || targetRole === "viewer" || targetRole === "member";
  }
  return false;
}
