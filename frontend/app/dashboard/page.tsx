"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PanelLeft,
  Upload,
  QrCode,
  Download,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Users,
  UserPlus,
  Mail,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { AddMemberModal } from "@/app/events/components/AddMemberModal";
import { QRCodeModal } from "@/app/dashboard/components/QRCodeModal";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { StatusDropdown } from "@/app/dashboard/components/StatusDropdown";
import { X } from "lucide-react";

interface EventMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface AttendanceRecord {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  check_in_time: string | null;
}

interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  total: number;
}

const COLORS = {
  present: "hsl(142, 71%, 45%)",
  late: "hsl(38, 92%, 50%)",
  absent: "hsl(0, 84%, 60%)",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export default function Dashboard() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogout = () => {
    apiClient.logout();
    router.replace("/sign-in");
    router.refresh();
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<EventMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<EventMember | null>(
    null,
  );
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessions, setSessions] = useState<
    Array<{ id: number; event_id: number; sequence_number: number }>
  >([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | number>("overview");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] =
    useState<AttendanceSummary | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [updatingStatusFor, setUpdatingStatusFor] = useState<number | null>(
    null,
  );
  const [overviewData, setOverviewData] = useState<{
    per_session: Array<{
      session_id: number;
      sequence_number: number;
      label: string;
      present: number;
      late: number;
      absent: number;
      total: number;
    }>;
    overall: { present: number; late: number; absent: number; total: number };
  } | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [selectedOverviewSessionId, setSelectedOverviewSessionId] = useState<
    number | null
  >(null);
  const eventId = searchParams?.get("eventId")
    ? parseInt(searchParams.get("eventId")!)
    : null;

  // Selected session data for summary cards and donut (default: latest session)
  const selectedSessionData = (() => {
    if (!overviewData?.per_session?.length) return null;
    const sorted = [...overviewData.per_session].sort(
      (a, b) => b.sequence_number - a.sequence_number,
    );
    const latest = sorted[0];
    const session = selectedOverviewSessionId
      ? overviewData.per_session.find(
          (s) => s.session_id === selectedOverviewSessionId,
        )
      : latest;
    return session ?? latest;
  })();

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await apiClient.getCurrentUser();
        // Backend returns {"data": user}, API client wraps it as {data: {data: user}}
        const userData = response.data?.data;
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    async function fetchMembers() {
      if (!eventId) {
        setMembers([]);
        return;
      }

      setLoadingMembers(true);
      try {
        const response = await apiClient.getEventUsers(eventId);
        if (response.error) {
          console.error("Failed to fetch members:", response.error);
          setMembers([]);
        } else {
          setMembers(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching members:", error);
        setMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    }
    fetchMembers();
  }, [eventId]);

  useEffect(() => {
    async function fetchSessions() {
      if (!eventId) {
        setSessions([]);
        return;
      }

      setLoadingSessions(true);
      try {
        const response = await apiClient.getSessions(eventId);
        if (response.error) {
          console.error("Failed to fetch sessions:", response.error);
          setSessions([]);
        } else {
          setSessions(response.data?.sessions || []);
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    }
    fetchSessions();
  }, [eventId]);

  useEffect(() => {
    async function fetchOverview() {
      if (!eventId || activeTab !== "overview") {
        setOverviewData(null);
        setSelectedOverviewSessionId(null);
        return;
      }
      setLoadingOverview(true);
      try {
        const response = await apiClient.getEventAttendanceOverview(eventId);
        if (response.error) {
          setOverviewData(null);
        } else {
          setOverviewData(response.data || null);
          setSelectedOverviewSessionId(null); // Reset to latest when data refreshes
        }
      } catch (error) {
        console.error("Error fetching overview:", error);
        setOverviewData(null);
      } finally {
        setLoadingOverview(false);
      }
    }
    fetchOverview();
  }, [eventId, activeTab]);

  useEffect(() => {
    async function fetchAttendance() {
      if (activeTab === "overview" || typeof activeTab !== "number") {
        setAttendance([]);
        setAttendanceSummary(null);
        return;
      }

      setLoadingAttendance(true);
      try {
        const response = await apiClient.getSessionAttendance(activeTab);
        if (response.error) {
          console.error("Failed to fetch attendance:", response.error);
          setAttendance([]);
          setAttendanceSummary(null);
        } else {
          setAttendance(response.data?.attendance || []);
          setAttendanceSummary(response.data?.summary || null);
        }
      } catch (error) {
        console.error("Error fetching attendance:", error);
        setAttendance([]);
        setAttendanceSummary(null);
      } finally {
        setLoadingAttendance(false);
      }
    }
    fetchAttendance();
  }, [activeTab]);

  const handleMemberAdded = () => {
    // Refresh members list
    if (eventId) {
      apiClient.getEventUsers(eventId).then((response) => {
        if (!response.error && response.data) {
          setMembers(response.data);
        }
      });
    }
  };

  const handleDeleteMemberClick = (
    member: EventMember,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setMemberToDelete(member);
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete || !eventId) return;
    setIsDeletingMember(true);
    try {
      const response = await apiClient.removeMember(eventId, memberToDelete.id);
      if (response.error) {
        alert(`Failed to remove member: ${response.error}`);
        throw new Error(response.error);
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
    } catch (error) {
      console.error("Error removing member:", error);
      throw error;
    } finally {
      setIsDeletingMember(false);
    }
  };

  const handleSendInvites = async () => {
    if (!eventId) return;
    const confirmed = confirm(
      "This will send invite emails to all members who haven't registered yet. Continue?",
    );
    if (!confirmed) return;

    setIsSendingInvites(true);
    try {
      const response = await apiClient.sendInviteEmails(eventId);
      if (response.error) {
        alert(`Failed to send invites: ${response.error}`);
      } else if (response.data) {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Error sending invites:", error);
      alert("Failed to send invite emails. Please try again.");
    } finally {
      setIsSendingInvites(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!eventId) return;
    setIsCreatingSession(true);
    try {
      const response = await apiClient.createSession(eventId);
      if (response.error) {
        alert(`Failed to create session: ${response.error}`);
        return;
      }
      if (response.data?.session?.id) {
        setActiveSessionId(response.data.session.id);
        setIsQRModalOpen(true);
        // Refresh sessions list
        const sessionsResponse = await apiClient.getSessions(eventId);
        if (!sessionsResponse.error && sessionsResponse.data?.sessions) {
          setSessions(sessionsResponse.data.sessions);
        }
      }
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Failed to create session. Please try again.");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleViewQR = (sessionId: number) => {
    setActiveSessionId(sessionId);
    setIsQRModalOpen(true);
  };

  const handleSelectTab = (tab: "overview" | number) => {
    setActiveTab(tab);
  };

  const handleStatusChange = async (
    record: AttendanceRecord,
    newStatus: "present" | "late" | "absent",
  ) => {
    if (typeof activeTab !== "number") return;
    setUpdatingStatusFor(record.user_id);
    try {
      const response = await apiClient.updateAttendanceStatus(
        record.user_id,
        activeTab,
        newStatus,
      );
      if (response.error) {
        alert(`Failed to update status: ${response.error}`);
        return;
      }
      // Refresh attendance and summary
      const refreshResponse = await apiClient.getSessionAttendance(activeTab);
      if (!refreshResponse.error && refreshResponse.data) {
        setAttendance(refreshResponse.data.attendance || []);
        setAttendanceSummary(refreshResponse.data.summary || null);
      }
      // Refresh overview data so charts update when switching back to Overview tab
      if (eventId) {
        const overviewResponse =
          await apiClient.getEventAttendanceOverview(eventId);
        if (!overviewResponse.error && overviewResponse.data) {
          setOverviewData(overviewResponse.data);
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingStatusFor(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600">Present</Badge>
        );
      case "late":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Late</Badge>;
      case "absent":
        return <Badge className="bg-red-500 hover:bg-red-600">Absent</Badge>;
      default:
        return (
          <Badge className="bg-gray-500 hover:bg-gray-600">{status}</Badge>
        );
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const formatStudentId = (id: number) => {
    return `STU-2024-${String(id).padStart(3, "0")}`;
  };

  return (
    <div className="flex min-h-screen bg-background2">
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
            <span className="text-xl font-bold whitespace-nowrap">
              VeriFace
            </span>
          )}
        </Link>

        <nav className="flex-1 space-y-2">
          <Link
            href="/dashboard"
            className={`w-full block text-left px-4 py-3 rounded-lg transition-colors ${
              pathname === "/dashboard"
                ? "bg-[var(--sidebar-accent)] font-medium"
                : "hover:bg-[var(--sidebar-accent)]/50"
            }`}
          >
            {isSidebarCollapsed ? "H" : "Home"}
          </Link>
          <Link
            href="/events"
            className={`w-full block text-left px-4 py-3 rounded-lg transition-colors ${
              pathname === "/events"
                ? "bg-[var(--sidebar-accent)] font-medium"
                : "hover:bg-[var(--sidebar-accent)]/50"
            }`}
          >
            {isSidebarCollapsed ? "E" : "Events"}
          </Link>
          <Link
            href="/settings"
            className={`w-full block text-left px-4 py-3 rounded-lg transition-colors ${
              pathname === "/settings"
                ? "bg-[var(--sidebar-accent)] font-medium"
                : "hover:bg-[var(--sidebar-accent)]/50"
            }`}
          >
            {isSidebarCollapsed ? "S" : "Settings"}
          </Link>
        </nav>

        {/* Logout + Profile Section */}
        {/* Logout Link */}
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 rounded-lg text-sm font-medium opacity-90 hover:bg-red-500/20 hover:text-red-400 transition"
        >
          Logout
        </button>
        <div className="p-4 border-t border-[var(--sidebar-border)]/30 space-y-4">
          {/* Profile Section */}
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
                <AvatarFallback className="bg-primary text-white font-semibold">
                  {getInitials(user.first_name, user.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">
                  {user.first_name} {user.last_name}
                </div>
                <div className="text-xs opacity-90 truncate">{user.email}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm opacity-90">Not logged in</div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
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
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-gray-800 text-white rounded-full text-sm font-medium">
              Admin
            </div>
          </div>
        </div>

        {/* Summary Cards - show selected/latest session */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-emerald-500">
                <Users className="h-5 w-5" />
                <span className="text-xs font-medium text-muted-foreground">
                  Present Today
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground2">
                {loadingOverview ? "—" : (selectedSessionData?.present ?? 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Out of{" "}
                {loadingOverview ? "—" : (selectedSessionData?.total ?? 0)}{" "}
                students
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertCircle className="h-5 w-5" />
                <span className="text-xs font-medium text-muted-foreground">
                  Late Arrivals
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground2">
                {loadingOverview ? "—" : (selectedSessionData?.late ?? 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Students arrived late
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                <span className="text-xs font-medium text-muted-foreground">
                  Absent Today
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground2">
                {loadingOverview ? "—" : (selectedSessionData?.absent ?? 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Not checked in yet
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-blue-500">
                <Users className="h-5 w-5" />
                <span className="text-xs font-medium text-muted-foreground">
                  Total Students
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground2">
                {loadingOverview ? "—" : (selectedSessionData?.total ?? 0)}
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedSessionData
                  ? selectedSessionData.label
                  : "Registered students"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          {eventId && (
            <>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => setIsAddMemberModalOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10 bg-transparent"
                onClick={handleGenerateQR}
                disabled={isCreatingSession}
              >
                <QrCode className="h-4 w-4 mr-2" />
                {isCreatingSession ? "Creating..." : "Start Session"}
              </Button>
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10 bg-transparent"
                onClick={handleSendInvites}
                disabled={isSendingInvites}
              >
                <Mail className="h-4 w-4 mr-2" />
                {isSendingInvites ? "Sending..." : "Send Invite Emails"}
              </Button>
            </>
          )}
          {!eventId && (
            <div className="text-sm text-muted-foreground">
              Select an event to manage members
            </div>
          )}
        </div>

        {/* Tabs */}
        {eventId && (
          <div className="mb-8">
            <div className="flex items-center gap-2 border-b mb-0">
              <button
                onClick={() => handleSelectTab("overview")}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "overview"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                }`}
              >
                Overview
              </button>
              {[...sessions]
                .sort((a, b) => b.sequence_number - a.sequence_number)
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectTab(s.id)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === s.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                    }`}
                  >
                    Session #{s.sequence_number}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Overview Tab Content */}
        {activeTab === "overview" && (
          <>
            {/* Charts Section */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              {/* Attendance by Session */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Attendance by Session</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click a bar to view that session&apos;s summary above
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {loadingOverview ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Loading...
                      </div>
                    ) : !overviewData?.per_session?.length ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No sessions yet. Start a session to see attendance data.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[...overviewData.per_session].sort(
                            (a, b) => a.sequence_number - b.sequence_number,
                          )}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar
                            dataKey="present"
                            fill={COLORS.present}
                            name="Present"
                            radius={[4, 4, 0, 0]}
                            onClick={(data: unknown) => {
                              const d = data as {
                                payload?: { session_id?: number };
                                session_id?: number;
                              };
                              const sessionId =
                                d?.payload?.session_id ?? d?.session_id;
                              if (sessionId != null) {
                                setSelectedOverviewSessionId(sessionId);
                              }
                            }}
                            style={{ cursor: "pointer" }}
                          />
                          <Bar
                            dataKey="late"
                            fill={COLORS.late}
                            name="Late"
                            radius={[4, 4, 0, 0]}
                            onClick={(data: unknown) => {
                              const d = data as {
                                payload?: { session_id?: number };
                                session_id?: number;
                              };
                              const sessionId =
                                d?.payload?.session_id ?? d?.session_id;
                              if (sessionId != null) {
                                setSelectedOverviewSessionId(sessionId);
                              }
                            }}
                            style={{ cursor: "pointer" }}
                          />
                          <Bar
                            dataKey="absent"
                            fill={COLORS.absent}
                            name="Absent"
                            radius={[4, 4, 0, 0]}
                            onClick={(data: unknown) => {
                              const d = data as {
                                payload?: { session_id?: number };
                                session_id?: number;
                              };
                              const sessionId =
                                d?.payload?.session_id ?? d?.session_id;
                              if (sessionId != null) {
                                setSelectedOverviewSessionId(sessionId);
                              }
                            }}
                            style={{ cursor: "pointer" }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Distribution for selected session */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedSessionData
                      ? `${selectedSessionData.label} Distribution`
                      : "Overall Distribution"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    {loadingOverview ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Loading...
                      </div>
                    ) : !selectedSessionData?.total ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No data yet
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "Present",
                                  value: selectedSessionData.present,
                                },
                                {
                                  name: "Late",
                                  value: selectedSessionData.late,
                                },
                                {
                                  name: "Absent",
                                  value: selectedSessionData.absent,
                                },
                              ].filter((d) => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {[
                                {
                                  name: "Present",
                                  value: selectedSessionData.present,
                                },
                                {
                                  name: "Late",
                                  value: selectedSessionData.late,
                                },
                                {
                                  name: "Absent",
                                  value: selectedSessionData.absent,
                                },
                              ]
                                .filter((d) => d.value > 0)
                                .map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      COLORS[
                                        entry.name.toLowerCase() as keyof typeof COLORS
                                      ]
                                    }
                                  />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-2">
                          {[
                            {
                              name: "Present",
                              value: selectedSessionData.present,
                            },
                            { name: "Late", value: selectedSessionData.late },
                            {
                              name: "Absent",
                              value: selectedSessionData.absent,
                            },
                          ].map((item) => {
                            const pct =
                              selectedSessionData.total > 0
                                ? Math.round(
                                    (item.value / selectedSessionData.total) *
                                      100,
                                  )
                                : 0;
                            return (
                              <div
                                key={item.name}
                                className="flex items-center justify-between text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                      backgroundColor:
                                        COLORS[
                                          item.name.toLowerCase() as keyof typeof COLORS
                                        ],
                                    }}
                                  />
                                  <span>{item.name}</span>
                                </div>
                                <span className="font-medium">
                                  {item.value} ({pct}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Members Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Members</CardTitle>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMembers ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Loading members...
                        </TableCell>
                      </TableRow>
                    ) : members.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-8 text-muted-foreground"
                        >
                          {eventId
                            ? "No members added yet. Click 'Add Member' to get started."
                            : "Select an event to view members."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((member) => (
                        <TableRow key={member.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-primary text-white">
                                  {getInitials(
                                    member.first_name,
                                    member.last_name,
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-foreground2">
                                  {member.first_name} {member.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatStudentId(member.id)}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={(e) =>
                                handleDeleteMemberClick(member, e)
                              }
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-red-500 hover:bg-red-600 text-white"
                              aria-label={`Remove ${member.first_name} ${member.last_name}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* Session Tab Content */}
        {typeof activeTab === "number" && (
          <div>
            {/* Session Actions */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Session #
                {sessions.find((s) => s.id === activeTab)?.sequence_number}
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary/10"
                onClick={() => handleViewQR(activeTab)}
              >
                <QrCode className="h-4 w-4 mr-2" />
                View QR
              </Button>
            </div>

            {/* Attendance Summary */}
            {attendanceSummary && (
              <div className="grid grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-emerald-500 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Present
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-foreground2">
                      {attendanceSummary.present}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of {attendanceSummary.total}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-amber-500 mb-1">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Late
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-foreground2">
                      {attendanceSummary.late}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of {attendanceSummary.total}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-red-500 mb-1">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Absent
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-foreground2">
                      {attendanceSummary.absent}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      of {attendanceSummary.total}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-blue-500 mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Total
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-foreground2">
                      {attendanceSummary.total}
                    </div>
                    <div className="text-xs text-muted-foreground">members</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Attendance Table */}
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check-in Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingAttendance ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Loading attendance...
                        </TableCell>
                      </TableRow>
                    ) : attendance.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No attendance records for this session.
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendance.map((record) => (
                        <TableRow key={record.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-primary text-white">
                                  {getInitials(
                                    record.first_name,
                                    record.last_name,
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-foreground2">
                                  {record.first_name} {record.last_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {record.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusDropdown
                              record={record}
                              updating={updatingStatusFor === record.user_id}
                              onStatusChange={handleStatusChange}
                            />
                          </TableCell>
                          <TableCell>
                            {record.check_in_time
                              ? new Date(
                                  record.check_in_time,
                                ).toLocaleTimeString()
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Add Member Modal */}
      {eventId && (
        <AddMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          eventId={eventId}
          onMemberAdded={handleMemberAdded}
        />
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        sessionId={activeSessionId}
      />

      {/* Delete Member Confirmation */}
      <DeleteConfirmDialog
        isOpen={memberToDelete !== null}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleConfirmDeleteMember}
        title="Remove Member"
        message={
          memberToDelete
            ? `Are you sure you want to remove ${memberToDelete.first_name} ${memberToDelete.last_name} from this event? They will no longer have access to this event.`
            : ""
        }
        confirmLabel="Remove Member"
        isLoading={isDeletingMember}
      />
    </div>
  );
}
