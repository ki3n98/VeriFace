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
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CheckCircle, Clock, XCircle, TrendingUp } from "lucide-react";
import { apiClient } from "@/lib/api";

interface MemberDashboardProps {
  eventId: number;
  eventName: string;
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

export function MemberDashboard({ eventId, eventName }: MemberDashboardProps) {
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

  const latestSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

  const chartData = sessions.map((s) => ({
    name: `Session ${s.sequence_number}`,
    present: s.status === "present" ? 1 : 0,
    late: s.status === "late" ? 1 : 0,
    absent: s.status === "absent" ? 1 : 0,
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

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
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

      {/* Latest Session Status */}
      {latestSession && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Latest Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Session {latestSession.sequence_number}
                  {latestSession.start_time && ` — ${formatDateTime(latestSession.start_time)}`}
                </p>
                <div className="mt-2">{statusBadge(latestSession.status)}</div>
              </div>
              <div className="text-right">
                {latestSession.check_in_time ? (
                  <p className="text-sm text-muted-foreground">
                    Checked in at {formatDateTime(latestSession.check_in_time)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not checked in</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Trend Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} domain={[0, 1]} ticks={[0, 1]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="present" fill={COLORS.present} name="Present" stackId="a" />
                <Bar dataKey="late" fill={COLORS.late} name="Late" stackId="a" />
                <Bar dataKey="absent" fill={COLORS.absent} name="Absent" stackId="a" />
              </BarChart>
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
          {sessions.length === 0 ? (
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
                {sessions.map((session) => (
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
