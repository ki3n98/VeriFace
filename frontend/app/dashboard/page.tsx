"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Upload, QrCode, Download, TrendingUp, TrendingDown, AlertCircle, Users } from "lucide-react"
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
} from "recharts"
import { useState } from "react"

// Hardcoded data
const summaryStats = {
  present: { count: 156, total: 180, percentage: 87, trend: "+2%" },
  late: { count: 18, total: 180, percentage: 10, trend: "+1%" },
  absent: { count: 6, total: 180, percentage: 3, trend: "-2%" },
  total: { count: 180, trend: "+2%" },
}

const weeklyData = [
  { day: "Monday", present: 165, late: 10, absent: 5 },
  { day: "Tuesday", present: 168, late: 8, absent: 4 },
  { day: "Wednesday", present: 170, late: 7, absent: 3 },
  { day: "Thursday", present: 172, late: 6, absent: 2 },
  { day: "Friday", present: 160, late: 15, absent: 5 },
  { day: "Saturday", present: 148, late: 18, absent: 14 },
  { day: "Sunday", present: 120, late: 20, absent: 40 },
]

const distributionData = [
  { name: "Present", value: 156, percentage: 87 },
  { name: "Late", value: 18, percentage: 10 },
  { name: "Absent", value: 6, percentage: 3 },
]

const attendanceList = [
  {
    id: 1,
    name: "John Doe",
    initials: "JD",
    studentId: "STU-2024-001",
    email: "john.doe@email.com",
    class: "Computer Science 101",
    checkIn: "08:45 AM",
    status: "On Time",
    faceMatch: 99.2,
  },
  {
    id: 2,
    name: "Emma Smith",
    initials: "ES",
    studentId: "STU-2024-002",
    email: "emma.smith@email.com",
    class: "Mathematics 201",
    checkIn: "09:15 AM",
    status: "Late",
    faceMatch: 98.7,
  },
  {
    id: 3,
    name: "Michael Johnson",
    initials: "MJ",
    studentId: "STU-2024-003",
    email: "michael.j@email.com",
    class: "Physics 301",
    checkIn: "08:30 AM",
    status: "On Time",
    faceMatch: 99.5,
  },
  {
    id: 4,
    name: "Sarah Williams",
    initials: "SW",
    studentId: "STU-2024-004",
    email: "sarah.w@email.com",
    class: "Chemistry 202",
    checkIn: "—",
    status: "Absent",
    faceMatch: 0,
  },
  {
    id: 5,
    name: "David Brown",
    initials: "DB",
    studentId: "STU-2024-005",
    email: "david.b@email.com",
    class: "English 101",
    checkIn: "08:50 AM",
    status: "On Time",
    faceMatch: 99.8,
  },
  {
    id: 6,
    name: "Lisa Martinez",
    initials: "LM",
    studentId: "STU-2024-006",
    email: "lisa.m@email.com",
    class: "Biology 201",
    checkIn: "09:05 AM",
    status: "Late",
    faceMatch: 98.3,
  },
  {
    id: 7,
    name: "Robert Garcia",
    initials: "RG",
    studentId: "STU-2024-007",
    email: "robert.g@email.com",
    class: "History 101",
    checkIn: "08:40 AM",
    status: "On Time",
    faceMatch: 99.1,
  },
  {
    id: 8,
    name: "Jennifer Lee",
    initials: "JL",
    studentId: "STU-2024-008",
    email: "jennifer.l@email.com",
    class: "Art 202",
    checkIn: "08:55 AM",
    status: "On Time",
    faceMatch: 99.4,
  },
]

const COLORS = {
  present: "hsl(142, 71%, 45%)",
  late: "hsl(38, 92%, 50%)",
  absent: "hsl(0, 84%, 60%)",
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const [viewMode, setViewMode] = useState("week")

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-purple-500 text-white p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <img src="/logo.png" alt="VeriFace Logo" className="h-8 w-auto" />
          </div>
          <span className="text-xl font-bold">VeriFace</span>
        </div>

        <nav className="flex-1 space-y-2">
          <button className="w-full text-left px-4 py-3 rounded-lg bg-purple-600 font-medium">Home</button>
          <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-purple-600/50 transition-colors">
            Settings
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-gray-800 text-white rounded-full text-sm font-medium">Admin</div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-emerald-500">
                <Users className="h-5 w-5" />
                <span className="text-xs font-medium text-muted-foreground">Present Today</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summaryStats.present.count}</div>
              <div className="text-sm text-muted-foreground">Out of {summaryStats.present.total} students</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-xs text-emerald-500">{summaryStats.present.trend}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertCircle className="h-5 w-5" />
                <span className="text-xs font-medium text-muted-foreground">Late Arrivals</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summaryStats.late.count}</div>
              <div className="text-sm text-muted-foreground">Students arrived late</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-500">{summaryStats.late.trend}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-5 w-5" />
                <span className="text-xs font-medium text-muted-foreground">Absent Today</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summaryStats.absent.count}</div>
              <div className="text-sm text-muted-foreground">Not checked in yet</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingDown className="h-3 w-3 text-emerald-500" />
                <span className="text-xs text-emerald-500">{summaryStats.absent.trend}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-blue-500">
                <Users className="h-5 w-5" />
                <span className="text-xs font-medium text-muted-foreground">Total Students</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summaryStats.total.count}</div>
              <div className="text-sm text-muted-foreground">Registered students</div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-blue-500">{summaryStats.total.trend}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Upload className="h-4 w-4 mr-2" />
            Upload members.csv
          </Button>
          <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50 bg-transparent">
            <QrCode className="h-4 w-4 mr-2" />
            Generate Token
          </Button>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Weekly Attendance Trends */}
          <Card className="col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Weekly Attendance Trends</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("day")}
                  >
                    Day
                  </Button>
                  <Button
                    variant={viewMode === "week" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("week")}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Week
                  </Button>
                  <Button
                    variant={viewMode === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("month")}
                  >
                    Month
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="present" fill={COLORS.present} name="Present" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" fill={COLORS.late} name="Late" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" fill={COLORS.absent} name="Absent" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Today's Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {distributionData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[item.name.toLowerCase() as keyof typeof COLORS] }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">
                      {item.value} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today's Attendance List</CardTitle>
              <Button className="bg-purple-600 hover:bg-purple-700">
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
                  <TableHead>Class</TableHead>
                  <TableHead>Check-in Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Face Match</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceList.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-purple-500 text-white">{student.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-muted-foreground">{student.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{student.studentId}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>{student.checkIn}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          student.status === "On Time"
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : student.status === "Late"
                              ? "bg-amber-500 hover:bg-amber-600"
                              : "bg-red-500 hover:bg-red-600"
                        }
                      >
                        {student.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.faceMatch > 0 ? `${student.faceMatch}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

