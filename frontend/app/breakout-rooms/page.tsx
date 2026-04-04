"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PanelLeft, Home, Calendar, Cog, LogOut, Users, X } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useEvents } from "@/lib/hooks/useEvents";
import { useBreakoutWebSocket } from "@/lib/hooks/useBreakoutWebSocket";
import {
  canAccessParticipation,
  canManageBreakouts,
  getRoleBadgeClass,
  getRoleLabel,
  isEventRole,
  type EventRole,
} from "@/lib/eventRoles";

interface BreakoutAssignment {
  user_id: number;
  room_number: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface BreakoutUpdatePayload {
  assignments?: BreakoutAssignment[];
}

interface EventMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: EventRole;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
}

export default function BreakoutRoomsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const eventId = searchParams?.get("eventId")
    ? parseInt(searchParams.get("eventId")!, 10)
    : null;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<EventMember[]>([]);
  // null = still loading, [] = loaded but no active rooms, [...] = active
  const [assignments, setAssignments] = useState<BreakoutAssignment[] | null>(null);
  const [checkedInUserIds, setCheckedInUserIds] = useState<Set<number>>(new Set());
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  // Owner setup state
  const [numRooms, setNumRooms] = useState(2);
  const [assignmentMode, setAssignmentMode] = useState<"auto" | "manual">("auto");
  const [pendingAssignments, setPendingAssignments] = useState<Record<number, number>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // Member state
  const [myRoomData, setMyRoomData] = useState<{
    room_number: number;
    members: Array<{ user_id: number; first_name: string; last_name: string; email: string }>;
  } | null>(null);
  const [loadingMyRoom, setLoadingMyRoom] = useState(false);

  const { events } = useEvents();
  const selectedEvent = events.find((e) => e.id === eventId);
  const queryRoleParam = searchParams?.get("role");
  const queryRole: EventRole | null = isEventRole(queryRoleParam)
    ? queryRoleParam
    : null;
  const userRole = selectedEvent?.role ?? queryRole ?? null;
  const canUseParticipation = canAccessParticipation(userRole);
  const canManageRooms = canManageBreakouts(userRole);

  const handleLogout = () => {
    apiClient.logout();
    router.replace("/sign-in");
    router.refresh();
  };

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await apiClient.getCurrentUser();
        const userData = response.data?.data;
        if (userData) {
          setUser(userData);
          if (userData.avatar_url) {
            const urlRes = await apiClient.getAvatarUrl();
            setAvatarSignedUrl(urlRes.data?.signed_url ?? null);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  // Fetch event members
  useEffect(() => {
    if (!eventId) return;
    apiClient.getEventUsers(eventId).then((res) => {
      if (!res.error && res.data) setMembers(res.data);
    });
  }, [eventId]);

  // Fetch latest session to use for attendance + websocket
  useEffect(() => {
    if (!eventId) return;
    apiClient.getSessions(eventId).then((res) => {
      if (!res.error && res.data?.sessions?.length) {
        const sorted = [...res.data.sessions].sort(
          (a, b) => b.sequence_number - a.sequence_number
        );
        setActiveSessionId(sorted[0].id);
      }
    });
  }, [eventId]);

  // Fetch attendance to know who is checked in
  useEffect(() => {
    if (!activeSessionId) return;
    apiClient.getSessionAttendance(activeSessionId).then((res) => {
      if (!res.error && res.data?.attendance) {
        const ids = new Set(
          res.data.attendance
            .filter((r) => r.status === "present" || r.status === "late")
            .map((r) => r.user_id)
        );
        setCheckedInUserIds(ids);
      }
    });
  }, [activeSessionId]);

  // Fetch breakout room assignments (owner)
  useEffect(() => {
    if (!canManageRooms || !eventId) return;
    apiClient.getBreakoutRooms(eventId).then((res) => {
      setAssignments(res.data?.assignments ?? []);
    });
  }, [canManageRooms, eventId]);

  // Fetch my room (member)
  useEffect(() => {
    if (userRole !== "member" || !eventId) return;
    setLoadingMyRoom(true);
    apiClient.getMyBreakoutRoom(eventId).then((res) => {
      if (!res.error && res.data?.room_number != null) {
        setMyRoomData({ room_number: res.data.room_number, members: res.data.members });
      } else {
        setMyRoomData(null);
      }
      setLoadingMyRoom(false);
    });
  }, [eventId, userRole]);

  // WebSocket live updates (scoped per session, all event members connected)
  const handleBreakoutUpdate = useCallback(
    (data: BreakoutUpdatePayload) => {
      if (canManageRooms) {
        setAssignments(data.assignments ?? []);
      } else if (user) {
        const assignments = data.assignments ?? [];
        const mine = assignments.find((assignment) => assignment.user_id === user.id);
        if (mine) {
          const roommates = assignments.filter(
            (assignment) =>
              assignment.room_number === mine.room_number && assignment.user_id !== user.id
          );
          setMyRoomData({ room_number: mine.room_number, members: roommates });
        } else {
          setMyRoomData(null);
        }
      }
    },
    [canManageRooms, user]
  );

  useBreakoutWebSocket(activeSessionId, handleBreakoutUpdate);

  // Derived
  const breakoutActive = assignments !== null && assignments.length > 0;

  const roomGroups = useMemo(() => {
    if (!assignments) return {} as Record<number, BreakoutAssignment[]>;
    return assignments.reduce(
      (acc, a) => {
        if (!acc[a.room_number]) acc[a.room_number] = [];
        acc[a.room_number].push(a);
        return acc;
      },
      {} as Record<number, BreakoutAssignment[]>
    );
  }, [assignments]);

  const assignedUserIds = useMemo(
    () => new Set(assignments?.map((a) => a.user_id) ?? []),
    [assignments]
  );

  const unassignedMembers = useMemo(
    () => members.filter((m) => !assignedUserIds.has(m.id)),
    [members, assignedUserIds]
  );

  const activeRoomNumbers = Object.keys(roomGroups).map(Number).sort((a, b) => a - b);
  const roomNumbers = Array.from({ length: numRooms }, (_, i) => i + 1);

  // Handlers (owner)
  const handleAutoAssign = async () => {
    if (!eventId) return;
    setIsCreating(true);
    const checkedInIds = members.filter((m) => checkedInUserIds.has(m.id)).map((m) => m.id);
    const res = await apiClient.autoAssignBreakoutRooms(eventId, numRooms, checkedInIds);
    if (res.error) {
      alert(`Failed to auto-assign: ${res.error}`);
    } else {
      const roomsRes = await apiClient.getBreakoutRooms(eventId);
      setAssignments(roomsRes.data?.assignments ?? []);
    }
    setIsCreating(false);
  };

  const handleManualConfirm = async () => {
    if (!eventId) return;
    setIsCreating(true);
    const byRoom: Record<number, number[]> = {};
    Object.entries(pendingAssignments).forEach(([userId, roomNum]) => {
      if (!byRoom[roomNum]) byRoom[roomNum] = [];
      byRoom[roomNum].push(parseInt(userId));
    });
    for (const [roomNum, userIds] of Object.entries(byRoom)) {
      await apiClient.pushUsersToBreakoutRoom(eventId, parseInt(roomNum), userIds);
    }
    const roomsRes = await apiClient.getBreakoutRooms(eventId);
    setAssignments(roomsRes.data?.assignments ?? []);
    setPendingAssignments({});
    setIsCreating(false);
  };

  const handleRemoveUser = async (userId: number) => {
    if (!eventId) return;
    const res = await apiClient.removeUserFromBreakoutRoom(eventId, userId);
    if (res.error) {
      alert(`Failed to remove user: ${res.error}`);
    } else {
      setAssignments((prev) => prev?.filter((a) => a.user_id !== userId) ?? []);
    }
  };

  const handleMoveUser = async (userId: number, newRoom: number) => {
    if (!eventId) return;
    await apiClient.removeUserFromBreakoutRoom(eventId, userId);
    await apiClient.pushUsersToBreakoutRoom(eventId, newRoom, [userId]);
    const roomsRes = await apiClient.getBreakoutRooms(eventId);
    setAssignments(roomsRes.data?.assignments ?? []);
  };

  const handleAssignUnassigned = async (userId: number, roomNum: number) => {
    if (!eventId) return;
    await apiClient.pushUsersToBreakoutRoom(eventId, roomNum, [userId]);
    const roomsRes = await apiClient.getBreakoutRooms(eventId);
    setAssignments(roomsRes.data?.assignments ?? []);
  };

  const handleEndRooms = async () => {
    if (!eventId) return;
    setIsEnding(true);
    const res = await apiClient.endBreakoutRooms(eventId);
    if (res.error) {
      alert(`Failed to end breakout rooms: ${res.error}`);
    } else {
      setAssignments([]);
    }
    setIsEnding(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background2">
      {/* Sidebar */}
      <aside
        className={`bg-[var(--sidebar)] text-[var(--sidebar-foreground)] flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "w-20 px-4 py-6" : "w-64 p-6"
        }`}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-3 mb-12 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <img src="/logo.png" alt="VeriFace Logo" className="h-8 w-auto" />
          </div>
          {!isSidebarCollapsed && (
            <span className="text-xl font-bold whitespace-nowrap">VeriFace</span>
          )}
        </Link>

        <nav className="flex-1 space-y-2">
          {[
            {
              href: "/dashboard",
              label: "Home",
              icon: Home,
              match: (p: string) => p === "/dashboard",
            },
            {
              href: "/events",
              label: "Events",
              icon: Calendar,
              match: (p: string) => p === "/events",
            },
            {
              href: "/settings",
              label: "Settings",
              icon: Cog,
              match: (p: string) => p?.startsWith("/settings"),
            },
            ...(canUseParticipation
              ? [{
                  href: eventId ? `/participation?eventId=${eventId}` : "/participation",
                  label: "Participation",
                  icon: Users,
                  match: (p: string) => p?.startsWith("/participation"),
                }]
              : []),
          ].map(({ href, label, icon: Icon, match }) => (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                match(pathname ?? "")
                  ? "bg-[var(--sidebar-accent)] font-medium"
                  : "hover:bg-[var(--sidebar-accent)]/50"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isSidebarCollapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-sm font-medium opacity-90 hover:bg-red-500/20 hover:text-red-400 transition"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isSidebarCollapsed && "Logout"}
        </button>
        <div className="p-4 border-t border-[var(--sidebar-border)]/30 space-y-4">
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 bg-white/10 rounded animate-pulse mb-2" />
                <div className="h-3 bg-white/10 rounded animate-pulse w-2/3" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white">
                {avatarSignedUrl && <AvatarImage src={avatarSignedUrl} alt="Avatar" />}
                <AvatarFallback className="bg-primary text-white font-semibold">
                  {getInitials(user.first_name, user.last_name)}
                </AvatarFallback>
              </Avatar>
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="text-xs opacity-90 truncate">{user.email}</div>
                </div>
              )}
            </div>
          ) : (
            !isSidebarCollapsed && <div className="text-sm opacity-90">Not logged in</div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            >
              <PanelLeft
                className={`h-5 w-5 transition-transform duration-300 ${
                  isSidebarCollapsed ? "rotate-180" : ""
                }`}
              />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Breakout Rooms</h1>
              {selectedEvent && (
                <p className="text-sm text-muted-foreground">{selectedEvent.event_name}</p>
              )}
            </div>
          </div>
          {userRole && (
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium text-white ${getRoleBadgeClass(userRole)}`}>
              {getRoleLabel(userRole)}
            </div>
          )}
        </div>

        {!eventId ? (
          <p className="text-muted-foreground">No event selected.</p>
        ) : canManageRooms ? (
          /* ── OWNER VIEW ── */
          assignments === null ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !breakoutActive ? (
            /* Setup form */
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle>Create Breakout Rooms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Number of Rooms</label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={numRooms}
                    onChange={(e) =>
                      setNumRooms(Math.max(2, parseInt(e.target.value) || 2))
                    }
                    className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Assignment Method</label>
                  <div className="flex gap-3">
                    {(["auto", "manual"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setAssignmentMode(mode)}
                        className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                          assignmentMode === mode
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-input bg-background hover:bg-accent"
                        }`}
                      >
                        {mode === "auto" ? "Auto Assign" : "Manual Assign"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {assignmentMode === "auto"
                      ? "Checked-in users will be randomly and evenly distributed across rooms."
                      : "Manually assign each user to a room before creating."}
                  </p>
                </div>

                {assignmentMode === "manual" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assign Users</label>
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {members.map((member) => {
                        const isCheckedIn = checkedInUserIds.has(member.id);
                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isCheckedIn ? "bg-emerald-500" : "bg-gray-300"
                                }`}
                              />
                              <span
                                className={`text-sm truncate ${
                                  isCheckedIn ? "text-foreground" : "text-muted-foreground"
                                }`}
                              >
                                {member.first_name} {member.last_name}
                                {!isCheckedIn && (
                                  <span className="ml-1 text-xs">(not checked in)</span>
                                )}
                              </span>
                            </div>
                            <select
                              value={pendingAssignments[member.id] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPendingAssignments((prev) => {
                                  if (!val) {
                                    const { [member.id]: _, ...rest } = prev;
                                    return rest;
                                  }
                                  return { ...prev, [member.id]: parseInt(val) };
                                });
                              }}
                              className="border border-input bg-background rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring shrink-0"
                            >
                              <option value="">Unassigned</option>
                              {roomNumbers.map((n) => (
                                <option key={n} value={n}>
                                  Room {n}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Button
                  onClick={assignmentMode === "auto" ? handleAutoAssign : handleManualConfirm}
                  disabled={isCreating}
                  className="w-full"
                >
                  {isCreating ? "Creating..." : "Create Breakout Rooms"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Active rooms view */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {activeRoomNumbers.length} room
                  {activeRoomNumbers.length !== 1 ? "s" : ""} active · {assignments.length}{" "}
                  student{assignments.length !== 1 ? "s" : ""} assigned
                </p>
                <Button variant="destructive" onClick={handleEndRooms} disabled={isEnding}>
                  {isEnding ? "Ending..." : "End Breakout Rooms"}
                </Button>
              </div>

              <div className="flex gap-6 items-start">
                {/* Room cards */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeRoomNumbers.map((roomNum) => (
                    <Card key={roomNum}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Room {roomNum}
                          <span className="ml-auto text-xs text-muted-foreground font-normal">
                            {roomGroups[roomNum].length} member
                            {roomGroups[roomNum].length !== 1 ? "s" : ""}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {roomGroups[roomNum].map((a) => (
                          <div key={a.user_id} className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                checkedInUserIds.has(a.user_id)
                                  ? "bg-emerald-500"
                                  : "bg-gray-300"
                              }`}
                            />
                            <span className="text-sm flex-1 truncate">
                              {a.first_name} {a.last_name}
                            </span>
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) handleMoveUser(a.user_id, parseInt(val));
                                e.currentTarget.value = "";
                              }}
                              className="border border-input bg-background rounded text-xs px-1 py-0.5 focus:outline-none"
                              title="Move to room"
                            >
                              <option value="" disabled>
                                Move
                              </option>
                              {activeRoomNumbers
                                .filter((n) => n !== roomNum)
                                .map((n) => (
                                  <option key={n} value={n}>
                                    Room {n}
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={() => handleRemoveUser(a.user_id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              title="Remove from room"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Unassigned panel */}
                {unassignedMembers.length > 0 && (
                  <div className="w-56 shrink-0">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          Unassigned{" "}
                          <span className="text-xs text-muted-foreground font-normal">
                            ({unassignedMembers.length})
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {unassignedMembers.map((m) => {
                          const isCheckedIn = checkedInUserIds.has(m.id);
                          return (
                            <div key={m.id} className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  isCheckedIn ? "bg-emerald-500" : "bg-gray-300"
                                }`}
                              />
                              <span
                                className={`text-xs flex-1 truncate ${
                                  isCheckedIn ? "text-foreground" : "text-muted-foreground"
                                }`}
                              >
                                {m.first_name} {m.last_name}
                                {!isCheckedIn && (
                                  <span className="ml-1 opacity-60">(not in)</span>
                                )}
                              </span>
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val) handleAssignUnassigned(m.id, parseInt(val));
                                  e.currentTarget.value = "";
                                }}
                                className="border border-input bg-background rounded text-xs px-1 py-0.5 focus:outline-none"
                                title="Assign to room"
                              >
                                <option value="" disabled>
                                  Assign
                                </option>
                                {activeRoomNumbers.map((n) => (
                                  <option key={n} value={n}>
                                    Room {n}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          )
        ) : userRole !== "member" ? (
          <Card className="max-w-md">
            <CardContent className="py-8 text-muted-foreground">
              You do not have permission to manage breakout rooms for this event.
            </CardContent>
          </Card>
        ) : (
          /* ── MEMBER VIEW ── */
          <div className="max-w-md">
            {loadingMyRoom ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : myRoomData ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Room {myRoomData.room_number}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {myRoomData.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      You are the only one in this room.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {myRoomData.members.map((m) => (
                        <li key={m.user_id} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-white text-xs font-semibold">
                              {getInitials(m.first_name, m.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">
                              {m.first_name} {m.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">{m.email}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">
                No breakout rooms have been created yet.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
