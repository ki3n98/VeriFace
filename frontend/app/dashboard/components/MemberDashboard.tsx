"use client";

import { useState, useEffect } from "react";
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
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
} from "lucide-react";
import {
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiClient } from "@/lib/api";

interface MemberDashboardProps {
  eventId: number;
}

interface SessionRecord {
  session_id: number;
  sequence_number: number;
  start_time: string | null;
  status: string;
  check_in_time: string | null;
}

interface Summary {
  total_sessions: number;
  present: number;
  late: number;
  absent: number;
  attendance_rate: number;
}

interface AttendancePoint {
  sessionId: number;
  sequenceNumber: number;
  dateLabel: string;
  fullDateTime: string;
  statusValue: number;
  statusLabel: string;
  checkInLabel: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: AttendancePoint;
  }>;
}

function StatusTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;

  return (
    <div className="rounded-lg border bg-white p-3 shadow-lg">
      <p className="font-medium">Session {point.sequenceNumber}</p>
      <p className="text-sm text-muted-foreground">{point.fullDateTime}</p>
      <p className="mt-2 text-sm">{point.statusLabel}</p>
      <p className="text-sm text-muted-foreground">{point.checkInLabel}</p>
    </div>
  );
}

export function MemberDashboard({ eventId }: MemberDashboardProps) {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyAttendance() {
      setLoading(true);
      const response = await apiClient.getMyAttendance(eventId);
      if (response.data) {
        setSessions(response.data.sessions || []);
        setSummary(response.data.summary || null);
      }
      setLoading(false);
    }
    fetchMyAttendance();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading your attendance...</div>
      </div>
    );
  }

  const formatDateTime = (dateStr: string | null, fallback = "—") => {
    if (!dateStr) return fallback;
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const orderedSessions = [...sessions].sort((a, b) => {
    const aTime = a.start_time ? new Date(a.start_time).getTime() : null;
    const bTime = b.start_time ? new Date(b.start_time).getTime() : null;

    if (aTime !== null && bTime !== null && aTime !== bTime) {
      return aTime - bTime;
    }

    if (aTime !== null && bTime === null) {
      return -1;
    }

    if (aTime === null && bTime !== null) {
      return 1;
    }

    return a.sequence_number - b.sequence_number;
  });

  const formatDateOnly = (dateStr: string | null) => {
    if (!dateStr) return `Session`;
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const attendancePoints: AttendancePoint[] = orderedSessions.map((session) => ({
    sessionId: session.session_id,
    sequenceNumber: session.sequence_number,
    dateLabel: formatDateOnly(session.start_time),
    fullDateTime: formatDateTime(session.start_time, "No scheduled time"),
    statusValue: session.status === "absent" ? 0 : 1,
    statusLabel: session.status === "absent" ? "Absent" : "Present",
    checkInLabel: session.check_in_time
      ? `Checked in at ${formatDateTime(session.check_in_time)}`
      : "No check-in recorded",
  }));

  const statusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Present</Badge>;
      case "late":
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Late</Badge>;
      case "absent":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Absent</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-purple-500 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 opacity-90" />
            <h3 className="text-sm font-medium opacity-90">Attendance Rate</h3>
          </div>
          <p className="text-3xl font-bold mb-1">{summary?.attendance_rate ?? 0}%</p>
          <p className="text-sm opacity-80">
            {(summary?.present ?? 0) + (summary?.late ?? 0)} of {summary?.total_sessions ?? 0} sessions
          </p>
        </div>

        <div className="bg-green-500 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 opacity-90" />
            <h3 className="text-sm font-medium opacity-90">Present</h3>
          </div>
          <p className="text-3xl font-bold mb-1">{summary?.present ?? 0}</p>
          <p className="text-sm opacity-80">Sessions on time</p>
        </div>

        <div className="bg-orange-500 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 opacity-90" />
            <h3 className="text-sm font-medium opacity-90">Late</h3>
          </div>
          <p className="text-3xl font-bold mb-1">{summary?.late ?? 0}</p>
          <p className="text-sm opacity-80">Sessions arrived late</p>
        </div>

        <div className="bg-red-500 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 opacity-90" />
            <h3 className="text-sm font-medium opacity-90">Absent</h3>
          </div>
          <p className="text-3xl font-bold mb-1">{summary?.absent ?? 0}</p>
          <p className="text-sm opacity-80">Sessions missed</p>
        </div>
      </div>

      {/* Attendance Graph */}
      {attendancePoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Attendance Graph</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 16, right: 16, bottom: 16, left: 0 }}>
                <XAxis
                  type="category"
                  dataKey="dateLabel"
                  name="Date"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="statusValue"
                  domain={[-0.25, 1.25]}
                  ticks={[0, 1]}
                  tickFormatter={(value) => (value === 0 ? "Absent" : "Present")}
                  width={70}
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<StatusTooltip />} />
                <Legend />
                <Scatter name="Attendance" data={attendancePoints} fill="hsl(142, 71%, 45%)">
                  {attendancePoints.map((point) => (
                    <Cell
                      key={point.sessionId}
                      fill={
                        point.statusValue === 0
                          ? "hsl(0, 84%, 60%)"
                          : "hsl(142, 71%, 45%)"
                      }
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Attendance History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {orderedSessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No sessions recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-in Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedSessions.map((session) => (
                  <TableRow key={session.session_id}>
                    <TableCell className="font-medium">
                      Session {session.sequence_number}
                    </TableCell>
                    <TableCell>{formatDateTime(session.start_time)}</TableCell>
                    <TableCell>{statusBadge(session.status)}</TableCell>
                    <TableCell>{formatDateTime(session.check_in_time)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
