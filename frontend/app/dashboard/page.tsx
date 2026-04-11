"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Home,
  Calendar,
  Cog,
  LogOut,
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
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useEvents } from "@/lib/hooks/useEvents";
import {
  canAccessParticipation,
  canAddMembers,
  canAssignRoles,
  canEditDefaults,
  canEditTargetRole,
  canManageSessions,
  canRemoveMembers,
  canViewAnalytics,
  getAssignableRolesForActor,
  getRoleBadgeClass,
  getRoleColor,
  getRoleLabel,
  isEventRole,
  type EventRole,
} from "@/lib/eventRoles";
import { AddMemberModal } from "@/app/events/components/AddMemberModal";
import { QRCodeModal } from "@/app/dashboard/components/QRCodeModal";
import { CreateSessionModal } from "@/app/dashboard/components/CreateSessionModal";
import { EditSessionStartTimeModal } from "@/app/dashboard/components/EditSessionStartTimeModal";
import { DefaultStartTimeModal } from "@/app/dashboard/components/DefaultStartTimeModal";
import { CheckInModal } from "@/app/dashboard/components/CheckInModal";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { MemberDashboard } from "@/app/dashboard/components/MemberDashboard";
import { StatusDropdown } from "@/app/dashboard/components/StatusDropdown";
import { useSessionWebSocket } from "@/lib/hooks/useWebSocket";
import {
  formatPacificClock,
  formatPacificDateTime,
  formatPacificTime,
} from "@/lib/datetime";
import { X, Camera, Clock, ChevronDown, History } from "lucide-react";

interface EventMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: EventRole;
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

interface ChartTooltipEntry {
  color: string;
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
}

interface LiveCheckInPayload {
  user_id: number;
  check_in_time: string | null;
}

interface AuditLogEntry {
  id: number;
  event_id: number;
  actor_user_id: number;
  actor_name: string;
  action: string;
  category: string;
  message: string;
  details?: Record<string, unknown> | null;
  created_at: string | null;
}

const COLORS = {
  present: "hsl(142, 71%, 45%)",
  late: "hsl(38, 92%, 50%)",
  absent: "hsl(0, 84%, 60%)",
};

const AUDIT_PAGE_SIZE = 25;

const AUDIT_FILTER_BTN: Record<
  "all" | "add" | "update" | "remove",
  { on: string; off: string }
> = {
  all: {
    on: "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-none",
    off: "!bg-white dark:!bg-zinc-900 border-primary/45 text-foreground hover:!bg-violet-50 dark:hover:!bg-violet-950/40 hover:!text-foreground shadow-none",
  },
  add: {
    on: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-none",
    off: "!bg-white dark:!bg-zinc-900 border-emerald-500/80 text-emerald-800 dark:text-emerald-200 hover:!bg-emerald-50 dark:hover:!bg-emerald-950/35 hover:!text-emerald-900 dark:hover:!text-emerald-100 shadow-none",
  },
  update: {
    on: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600 shadow-none",
    off: "!bg-white dark:!bg-zinc-900 border-amber-500/85 text-amber-900 dark:text-amber-100 hover:!bg-amber-50 dark:hover:!bg-amber-950/40 hover:!text-amber-950 dark:hover:!text-amber-50 shadow-none",
  },
  remove: {
    on: "bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-none",
    off: "!bg-white dark:!bg-zinc-900 border-red-500/85 text-red-800 dark:text-red-200 hover:!bg-red-50 dark:hover:!bg-red-950/35 hover:!text-red-900 dark:hover:!text-red-100 shadow-none",
  },
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry, index: number) => (
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
  avatar_url: string | null;
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
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const eventDropdownRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<EventMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<EventMember | null>(
    null,
  );
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState(false);
  const [isEditStartTimeModalOpen, setIsEditStartTimeModalOpen] = useState(false);
  const [isDefaultStartTimeModalOpen, setIsDefaultStartTimeModalOpen] =
    useState(false);
  const [isUpdatingStartTime, setIsUpdatingStartTime] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [openRoleMenuFor, setOpenRoleMenuFor] = useState<number | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessions, setSessions] = useState<
    Array<{ id: number; event_id: number; sequence_number: number; start_time?: string | null }>
  >([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "sessions" | "audit"
  >("overview");
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingAuditMore, setLoadingAuditMore] = useState(false);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<
    "all" | "add" | "remove" | "update"
  >("all");
  const [auditRefreshTrigger, setAuditRefreshTrigger] = useState(0);
  const auditScrollRef = useRef<HTMLDivElement | null>(null);
  const auditLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
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
    ? parseInt(searchParams.get("eventId")!, 10)
    : null;
  const {
    events,
    loading: loadingEvents,
    refetch: refetchEvents,
  } = useEvents();
  const selectedEvent = events.find((e) => e.id === eventId);

  useEffect(() => {
    if (eventId) {
      localStorage.setItem("lastEventId", String(eventId));
      if (selectedEvent?.event_name) {
        localStorage.setItem("lastEventName", selectedEvent.event_name);
      }
    } else {
      const saved = localStorage.getItem("lastEventId");
      if (saved) {
        router.replace(`/dashboard?eventId=${saved}`);
      }
    }
  }, [eventId, selectedEvent]); // eslint-disable-line react-hooks/exhaustive-deps
  const queryRoleParam = searchParams?.get("role");
  const queryRole: EventRole | null = isEventRole(queryRoleParam)
    ? queryRoleParam
    : null;
  const userRole = selectedEvent?.role ?? queryRole ?? null;
  const isRoleResolved = !eventId || !!selectedEvent || !loadingEvents;
  const canViewEventAnalytics = isRoleResolved && canViewAnalytics(userRole);
  const canOperateSessions = isRoleResolved && canManageSessions(userRole);
  const canManageMemberAdds = isRoleResolved && canAddMembers(userRole);
  const canDeleteMembers = isRoleResolved && canRemoveMembers(userRole);
  const canChangeRoles = isRoleResolved && canAssignRoles(userRole);
  const canChangeDefaultTime = isRoleResolved && canEditDefaults(userRole);
  const canUseParticipation = isRoleResolved && canAccessParticipation(userRole);
  const assignableRoles = getAssignableRolesForActor(userRole);

  // Live check-in via WebSocket
  const handleLiveCheckIn = useCallback((data: LiveCheckInPayload) => {
    // Update the attendance list — change user's status to "present"
    setAttendance((prev) =>
      prev.map((record) =>
        record.user_id === data.user_id
          ? { ...record, status: "present", check_in_time: data.check_in_time }
          : record,
      ),
    );
    // Update summary counts
    setAttendanceSummary((prev) =>
      prev
        ? {
            ...prev,
            present: prev.present + 1,
            absent: Math.max(0, prev.absent - 1),
          }
        : prev,
    );
  }, []);

  const { isConnected } = useSessionWebSocket(
    activeTab === "sessions" ? selectedSessionId : null,
    handleLiveCheckIn,
  );

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(e.target as Node)) {
        setIsEventDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchMembers() {
      if (!eventId || !isRoleResolved || !canViewEventAnalytics) {
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
  }, [eventId, canViewEventAnalytics, isRoleResolved]);

  useEffect(() => {
    async function fetchSessions() {
      if (!eventId || !isRoleResolved || !canOperateSessions) {
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
  }, [eventId, canOperateSessions, isRoleResolved]);

  useEffect(() => {
    async function fetchOverview() {
      if (!eventId || !isRoleResolved || !canViewEventAnalytics || activeTab !== "overview") {
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
  }, [eventId, activeTab, canViewEventAnalytics, isRoleResolved]);

  useEffect(() => {
    async function fetchAttendance() {
      if (activeTab !== "sessions" || !selectedSessionId) {
        setAttendance([]);
        setAttendanceSummary(null);
        return;
      }

      setLoadingAttendance(true);
      try {
        const response = await apiClient.getSessionAttendance(selectedSessionId);
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
  }, [activeTab, selectedSessionId]);

  useEffect(() => {
    if (
      activeTab !== "audit" ||
      !eventId ||
      !isRoleResolved ||
      !canOperateSessions
    ) {
      return;
    }
    const auditEventId = eventId;
    let cancelled = false;
    async function fetchAuditFirstPage() {
      setLoadingAudit(true);
      try {
        const response = await apiClient.getEventAuditLog(auditEventId, {
          limit: AUDIT_PAGE_SIZE,
          offset: 0,
          category:
            auditCategoryFilter === "all" ? undefined : auditCategoryFilter,
        });
        if (cancelled) return;
        if (response.error) {
          console.error("Audit log:", response.error);
          setAuditEntries([]);
          setAuditHasMore(false);
        } else {
          setAuditEntries(response.data?.entries ?? []);
          setAuditHasMore(response.data?.has_more ?? false);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setAuditEntries([]);
          setAuditHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setLoadingAudit(false);
        }
      }
    }
    fetchAuditFirstPage();
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    eventId,
    canOperateSessions,
    isRoleResolved,
    auditRefreshTrigger,
    auditCategoryFilter,
  ]);

  const loadMoreAudit = useCallback(async () => {
    if (
      !eventId ||
      !auditHasMore ||
      loadingAuditMore ||
      loadingAudit ||
      activeTab !== "audit"
    ) {
      return;
    }
    setLoadingAuditMore(true);
    try {
      const response = await apiClient.getEventAuditLog(eventId, {
        limit: AUDIT_PAGE_SIZE,
        offset: auditEntries.length,
        category:
          auditCategoryFilter === "all" ? undefined : auditCategoryFilter,
      });
      if (!response.error && response.data) {
        const page = response.data;
        setAuditEntries((prev) => [...prev, ...page.entries]);
        setAuditHasMore(page.has_more);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAuditMore(false);
    }
  }, [
    eventId,
    auditHasMore,
    loadingAuditMore,
    loadingAudit,
    activeTab,
    auditEntries.length,
    auditCategoryFilter,
  ]);

  useEffect(() => {
    if (activeTab !== "audit" || !auditHasMore) {
      return;
    }
    const rootEl = auditScrollRef.current;
    const target = auditLoadMoreRef.current;
    if (!rootEl || !target) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          loadMoreAudit();
        }
      },
      { root: rootEl, rootMargin: "80px", threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [activeTab, auditHasMore, loadMoreAudit, auditEntries.length]);

  const bumpAuditRefresh = () =>
    setAuditRefreshTrigger((n) => n + 1);

  const handleMemberAdded = () => {
    // Refresh members list
    if (eventId) {
      apiClient.getEventUsers(eventId).then((response) => {
        if (!response.error && response.data) {
          setMembers(response.data);
        }
      });
    }
    bumpAuditRefresh();
  };

  const handleUpdateRole = async (member: EventMember, newRole: EventRole) => {
    if (!eventId) return;
    if (newRole === member.role) return;
    try {
      setOpenRoleMenuFor(null);
      const response = await apiClient.updateMemberRole(eventId, member.id, newRole);
      if (response.error) {
        alert(`Failed to update role: ${response.error}`);
        return;
      }
      // Refresh members list
      const membersResponse = await apiClient.getEventUsers(eventId);
      if (!membersResponse.error && membersResponse.data) {
        setMembers(membersResponse.data);
      }
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role. Please try again.");
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
      bumpAuditRefresh();
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

  const handleOpenCreateSession = () => {
    setIsCreateSessionModalOpen(true);
  };

  const handleCreateSession = async (startTime: string | null) => {
    if (!eventId) return;
    setIsCreatingSession(true);
    try {
      const response = await apiClient.createSession(eventId, startTime ?? undefined);
      if (response.error) {
        alert(`Failed to create session: ${response.error}`);
        return;
      }
      if (response.data?.session?.id) {
        setIsCreateSessionModalOpen(false);
        setActiveSessionId(response.data.session.id);
        setIsQRModalOpen(true);
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

  const handleUpdateDefaultStartTime = async (defaultStartTime: string | null) => {
    if (!eventId) return;
    const response = await apiClient.updateEventDefaultStartTime(
      eventId,
      defaultStartTime
    );
    if (response.error) {
      throw new Error(response.error);
    }
    await refetchEvents();
    bumpAuditRefresh();
  };

  const handleUpdateSessionStartTime = async (startTime: string | null) => {
    if (!selectedSessionId || !eventId) return;
    setIsUpdatingStartTime(true);
    try {
      const response = await apiClient.updateSessionStartTime(selectedSessionId, startTime);
      if (response.error) {
        alert(`Failed to update: ${response.error}`);
        return;
      }
      setIsEditStartTimeModalOpen(false);
      const sessionsResponse = await apiClient.getSessions(eventId);
      if (!sessionsResponse.error && sessionsResponse.data?.sessions) {
        setSessions(sessionsResponse.data.sessions);
      }
      bumpAuditRefresh();
    } catch (error) {
      console.error("Error updating start time:", error);
      alert("Failed to update start time.");
    } finally {
      setIsUpdatingStartTime(false);
    }
  };

  const handleSelectTab = (tab: "overview" | "sessions" | "audit") => {
    setActiveTab(tab);
    if (tab === "sessions" && sessions.length > 0) {
      // Auto-select latest session (highest sequence_number)
      const sorted = [...sessions].sort(
        (a, b) => b.sequence_number - a.sequence_number,
      );
      setSelectedSessionId(sorted[0].id);
    }
  };

  const handleStatusChange = async (
    record: AttendanceRecord,
    newStatus: "present" | "late" | "absent",
  ) => {
    if (!selectedSessionId) return;
    setUpdatingStatusFor(record.user_id);
    try {
      const response = await apiClient.updateAttendanceStatus(
        record.user_id,
        selectedSessionId,
        newStatus,
      );
      if (response.error) {
        alert(`Failed to update status: ${response.error}`);
        return;
      }
      // Refresh attendance and summary
      const refreshResponse = await apiClient.getSessionAttendance(selectedSessionId);
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
      bumpAuditRefresh();
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

  const handleExportReport = async () => {
    if (!eventId || members.length === 0) return;
    setIsExporting(true);
    try {
      const sessionsRes = await apiClient.getSessions(eventId);
      const sessionsList = sessionsRes.data?.sessions ?? [];
      const sortedSessions = [...sessionsList].sort(
        (a, b) => a.sequence_number - b.sequence_number
      );

      const studentMap = new Map<
        number,
        {
          name: string;
          studentId: string;
          email: string;
          sessions: Record<number, string>;
        }
      >();

      for (const m of members) {
        studentMap.set(m.id, {
          name: `${m.first_name} ${m.last_name}`,
          studentId: formatStudentId(m.id),
          email: m.email,
          sessions: {},
        });
      }

      for (const session of sortedSessions) {
        const attRes = await apiClient.getSessionAttendance(session.id);
        const records = attRes.data?.attendance ?? [];
        for (const r of records) {
          const entry = studentMap.get(r.user_id);
          if (entry) {
            entry.sessions[session.id] = r.status;
          }
        }
      }

      const escapeCsv = (s: string) => {
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const sessionHeaders = sortedSessions.map(
        (s) => `Session ${s.sequence_number}`
      );
      const headerRow = [
        "Student Name",
        "Student ID",
        "Email",
        ...sessionHeaders,
      ].map(escapeCsv).join(",");

      const dataRows = Array.from(studentMap.values()).map((entry) => {
        const sessionValues = sortedSessions.map(
          (s) => entry.sessions[s.id] ?? "—"
        );
        return [
          entry.name,
          entry.studentId,
          entry.email,
          ...sessionValues,
        ]
          .map(escapeCsv)
          .join(",");
      });

      const csv = [headerRow, ...dataRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-report-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
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
          className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
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

        {selectedEvent && (
          isSidebarCollapsed ? (
            <div className="mb-6 flex justify-center overflow-hidden">
              <span
                className="text-xs font-medium text-white/60 truncate text-center w-full">
                {selectedEvent.event_name}
              </span>
            </div>
          ) : (
            <div className="mb-6 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/40 mb-0.5">Selected Event</p>
              <p className="text-sm font-medium truncate">{selectedEvent.event_name}</p>
            </div>
          )
        )}
        {!selectedEvent && isSidebarCollapsed && <div className="mb-8" />}

        <nav className="flex-1 space-y-2">
          {[
            { href: "/dashboard", label: "Event Dashboard", icon: Home, match: (p: string) => p === "/dashboard" },
            { href: "/events", label: "Manage Events", icon: Calendar, match: (p: string) => p === "/events" },
            ...(!canUseParticipation
              ? []
              : [{
                  href: eventId ? `/participation?eventId=${eventId}` : "/participation",
                  label: "Participation",
                  icon: Users,
                  match: (p: string) => p?.startsWith("/participation"),
                }]),
            { href: "/settings", label: "Settings", icon: Cog, match: (p: string) => p?.startsWith("/settings") },
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

        {/* Logout + Profile Section */}
        {/* Logout Link */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-sm font-medium opacity-90 hover:bg-red-500/20 hover:text-red-400 transition"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isSidebarCollapsed && "Logout"}
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
                {avatarSignedUrl && <AvatarImage src={avatarSignedUrl} alt="Avatar" />}
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
            {selectedEvent && (
              <div className="relative" ref={eventDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsEventDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 text-xl font-semibold text-foreground2 hover:opacity-70 transition"
                >
                  {selectedEvent.event_name}
                  <ChevronDown className={`h-5 w-5 transition-transform ${isEventDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {isEventDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 overflow-hidden">
                    {events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => {
                          router.push(`/dashboard?eventId=${event.id}&role=${event.role}`);
                          setIsEventDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors ${event.id === eventId ? "font-semibold text-primary" : "text-foreground"}`}
                      >
                        {event.event_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {userRole && (
              <div className={`px-3 py-1.5 rounded-full text-sm font-medium text-white ${getRoleBadgeClass(userRole)}`}>
                {getRoleLabel(userRole)}
              </div>
            )}
          </div>
        </div>

        {/* No event selected */}
        {!eventId && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
            <Calendar className="h-12 w-12 text-muted-foreground opacity-40" />
            <p className="text-lg font-medium text-muted-foreground">
              No event selected
            </p>
            <p className="text-sm text-muted-foreground/70">
              Please select an event from the{" "}
              <Link href="/events" className="underline hover:text-foreground transition">
                Events page
              </Link>{" "}
              to see your dashboard.
            </p>
          </div>
        )}

        {/* Member View */}
        {userRole === "member" && eventId && (
          <MemberDashboard eventId={eventId} />
        )}

        {/* Analytics / Staff View */}
        {userRole && userRole !== "member" && (
        <>
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
              {canManageMemberAdds && (
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setIsAddMemberModalOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              )}
              {canOperateSessions && (
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10 bg-transparent"
                  onClick={handleOpenCreateSession}
                  disabled={isCreatingSession}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Start Session
                </Button>
              )}
              {canManageMemberAdds && (
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10 bg-transparent"
                  onClick={handleSendInvites}
                  disabled={isSendingInvites}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {isSendingInvites ? "Sending..." : "Send Invite Emails"}
                </Button>
              )}
              {canChangeDefaultTime && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary hover:bg-primary/10 bg-transparent"
                  onClick={() => setIsDefaultStartTimeModalOpen(true)}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {selectedEvent?.default_start_time
                    ? "Change default time"
                    : "Set default time"}
                </Button>
              )}
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
              {canOperateSessions && sessions.length > 0 && (
                <button
                  onClick={() => handleSelectTab("sessions")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "sessions"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                  }`}
                >
                  Sessions
                </button>
              )}
              {canOperateSessions && (
                <button
                  type="button"
                  onClick={() => handleSelectTab("audit")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors inline-flex items-center gap-1.5 ${
                    activeTab === "audit"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                  }`}
                >
                  <History className="h-3.5 w-3.5" />
                  Audit Log
                </button>
              )}
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
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
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
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
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
                  <Button
                    className="bg-primary hover:bg-primary/90"
                    onClick={handleExportReport}
                    disabled={!eventId || members.length === 0 || isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? "Exporting…" : "Export Report"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMembers ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Loading members...
                        </TableCell>
                      </TableRow>
                    ) : members.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
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
                            {canChangeRoles && canEditTargetRole(userRole, member.role) ? (
                              <div className="relative inline-block">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenRoleMenuFor((current) =>
                                      current === member.id ? null : member.id,
                                    )
                                  }
                                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                  style={{ backgroundColor: getRoleColor(member.role) }}
                                >
                                  <span>{getRoleLabel(member.role)}</span>
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                                {openRoleMenuFor === member.id && (
                                  <div className="absolute left-0 top-full z-20 mt-2 min-w-[10rem] overflow-hidden rounded-xl border bg-white shadow-lg">
                                    {assignableRoles.map((role) => (
                                      <button
                                        key={role}
                                        type="button"
                                        onClick={() => handleUpdateRole(member, role)}
                                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-white transition-opacity hover:opacity-90"
                                        style={{ backgroundColor: getRoleColor(role) }}
                                      >
                                        <span>{getRoleLabel(role)}</span>
                                        {member.role === role && <span className="text-xs">Current</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Badge className={`${getRoleBadgeClass(member.role)} text-white`}>
                                {getRoleLabel(member.role)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {canDeleteMembers && (
                              <button
                                onClick={(e) =>
                                  handleDeleteMemberClick(member, e)
                                }
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-red-500 hover:bg-red-600 text-white"
                                aria-label={`Remove ${member.first_name} ${member.last_name}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
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
        {activeTab === "sessions" && (
          <div>
            {/* Session Selector and Actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={selectedSessionId ?? ""}
                  onChange={(e) => setSelectedSessionId(Number(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {[...sessions]
                    .sort((a, b) => b.sequence_number - a.sequence_number)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        Session {s.sequence_number}
                      </option>
                    ))}
                </select>
                {selectedSessionId && (() => {
                  const session = sessions.find(
                    (s) => s.id === selectedSessionId
                  );
                  const st = session?.start_time ?? null;
                  const display = formatPacificClock(st);
                  return (
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Start time: {display}
                    </span>
                  );
                })()}
                {isConnected && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              {selectedSessionId && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary text-primary hover:bg-primary/10 bg-transparent"
                    onClick={() => setIsEditStartTimeModalOpen(true)}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Set Start Time
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary text-white hover:bg-primary/10"
                    onClick={() => handleViewQR(selectedSessionId)}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    View QR
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => setIsCheckInModalOpen(true)}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Check In
                  </Button>
                </div>
              )}
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
                            {canOperateSessions ? (
                              <StatusDropdown
                                record={record}
                                updating={updatingStatusFor === record.user_id}
                                onStatusChange={handleStatusChange}
                              />
                            ) : (
                              getStatusBadge(record.status)
                            )}
                          </TableCell>
                          <TableCell>
                            {formatPacificTime(record.check_in_time)}
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

        {activeTab === "audit" && canOperateSessions && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Audit Log
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Recent admin actions for this event (add/remove members,
                  attendance changes, session and default start times). Scroll
                  down to load older entries.
                </p>
                <div
                  className="flex flex-wrap gap-2 pt-2"
                  role="toolbar"
                  aria-label="Filter audit log by action type"
                >
                  {(
                    [
                      { key: "all" as const, label: "All" },
                      { key: "add" as const, label: "Added" },
                      { key: "update" as const, label: "Updates" },
                      { key: "remove" as const, label: "Removed" },
                    ] as const
                  ).map(({ key, label }) => {
                    const on = auditCategoryFilter === key;
                    const palette = AUDIT_FILTER_BTN[key];
                    return (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={on ? palette.on : palette.off}
                      onClick={() => setAuditCategoryFilter(key)}
                    >
                      {label}
                    </Button>
                    );
                  })}
                </div>
              </CardHeader>
              <CardContent>
                {loadingAudit ? (
                  <div className="py-12 text-center text-muted-foreground">
                    Loading activity…
                  </div>
                ) : auditEntries.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    {auditCategoryFilter === "all"
                      ? "No logged actions yet. Actions you take from this dashboard will appear here."
                      : "No actions in this category yet."}
                  </div>
                ) : (
                  <>
                    <div
                      ref={auditScrollRef}
                      className="max-h-[min(70vh,640px)] overflow-y-auto pr-1"
                    >
                    <ul className="space-y-3">
                      {auditEntries.map((entry) => {
                      const cat = entry.category?.toLowerCase() ?? "update";
                      const rowClass =
                        cat === "add"
                          ? "border-l-4 border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/30"
                          : cat === "remove"
                            ? "border-l-4 border-red-500 bg-red-50/90 dark:bg-red-950/30"
                            : "border-l-4 border-amber-500 bg-amber-50/90 dark:bg-amber-950/30";
                      const dotClass =
                        cat === "add"
                          ? "bg-emerald-500"
                          : cat === "remove"
                            ? "bg-red-500"
                            : "bg-amber-500";
                      const when = formatPacificDateTime(entry.created_at);
                      return (
                        <li
                          key={entry.id}
                          className={`rounded-lg border border-border/60 pl-4 pr-4 py-3 shadow-sm ${rowClass}`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass}`}
                              aria-hidden
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground leading-snug">
                                {entry.message}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>{when}</span>
                                <span className="text-foreground/80">
                                  by {entry.actor_name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="font-normal capitalize"
                                >
                                  {entry.action.replace(/_/g, " ")}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                    </ul>
                    {auditHasMore && (
                      <div
                        ref={auditLoadMoreRef}
                        className="flex min-h-12 items-center justify-center py-4"
                        aria-hidden
                      >
                        {loadingAuditMore ? (
                          <span className="text-sm text-muted-foreground">
                            Loading more…
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Scroll for older entries
                          </span>
                        )}
                      </div>
                    )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </>
        )}
      </main>

      {/* Add Member Modal */}
      {eventId && canManageMemberAdds && (
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

      {canOperateSessions && (
        <CreateSessionModal
          isOpen={isCreateSessionModalOpen}
          onClose={() => setIsCreateSessionModalOpen(false)}
          onCreate={handleCreateSession}
          isCreating={isCreatingSession}
        />
      )}

      {canOperateSessions && (
        <EditSessionStartTimeModal
          isOpen={isEditStartTimeModalOpen}
          onClose={() => setIsEditStartTimeModalOpen(false)}
          onSave={handleUpdateSessionStartTime}
          isSaving={isUpdatingStartTime}
          sessionNumber={
            sessions.find((s) => s.id === selectedSessionId)?.sequence_number ?? 0
          }
          currentStartTime={
            sessions.find((s) => s.id === selectedSessionId)?.start_time ?? null
          }
        />
      )}

      {canChangeDefaultTime && (
        <DefaultStartTimeModal
          isOpen={isDefaultStartTimeModalOpen}
          onClose={() => setIsDefaultStartTimeModalOpen(false)}
          onSave={handleUpdateDefaultStartTime}
          currentDefaultTime={selectedEvent?.default_start_time ?? null}
        />
      )}

      {/* Camera Check-In Modal */}
      {canOperateSessions && (
        <CheckInModal
          isOpen={isCheckInModalOpen}
          onClose={() => setIsCheckInModalOpen(false)}
          sessionId={selectedSessionId}
        />
      )}

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
