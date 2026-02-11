"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PanelLeft, Upload, QrCode, Download, TrendingUp, TrendingDown, AlertCircle, Users, UserPlus } from "lucide-react"
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
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { apiClient } from "@/lib/api"
import { AddMemberModal } from "@/app/events/components/AddMemberModal"
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog"
import { X } from "lucide-react"

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

interface EventMember {
  id: number
  first_name: string
  last_name: string
  email: string
}

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

interface User {
  id: number
  first_name: string
  last_name: string
  email: string
}

export default function Dashboard() {
  const [viewMode, setViewMode] = useState("week")
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<EventMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<EventMember | null>(null)
  const [isDeletingMember, setIsDeletingMember] = useState(false)
  const eventId = searchParams?.get('eventId') ? parseInt(searchParams.get('eventId')!) : null

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await apiClient.getCurrentUser()
        // Backend returns {"data": user}, API client wraps it as {data: {data: user}}
        const userData = response.data?.data
        if (userData) {
          setUser(userData)
        }
      } catch (error) {
        console.error('Failed to fetch user:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    async function fetchMembers() {
      if (!eventId) {
        setMembers([])
        return
      }

      setLoadingMembers(true)
      try {
        const response = await apiClient.getEventUsers(eventId)
        if (response.error) {
          console.error('Failed to fetch members:', response.error)
          setMembers([])
        } else {
          setMembers(response.data || [])
        }
      } catch (error) {
        console.error('Error fetching members:', error)
        setMembers([])
      } finally {
        setLoadingMembers(false)
      }
    }
    fetchMembers()
  }, [eventId])

  const handleMemberAdded = () => {
    // Refresh members list
    if (eventId) {
      apiClient.getEventUsers(eventId).then((response) => {
        if (!response.error && response.data) {
          setMembers(response.data)
        }
      })
    }
  }

  const handleDeleteMemberClick = (member: EventMember, e: React.MouseEvent) => {
    e.stopPropagation()
    setMemberToDelete(member)
  }

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete || !eventId) return
    setIsDeletingMember(true)
    try {
      const response = await apiClient.removeMember(eventId, memberToDelete.id)
      if (response.error) {
        alert(`Failed to remove member: ${response.error}`)
        throw new Error(response.error)
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id))
    } catch (error) {
      console.error("Error removing member:", error)
      throw error
    } finally {
      setIsDeletingMember(false)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const formatStudentId = (id: number) => {
    return `STU-2024-${String(id).padStart(3, '0')}`
  }

  return (
    <div className="flex min-h-screen bg-background2">
      {/* Sidebar */}
      <aside
        className={`bg-purple-500 text-white flex flex-col transition-all duration-300 ${
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
          <Link
            href="/dashboard"
            className={`w-full block text-left px-4 py-3 rounded-lg transition-colors ${
              pathname === '/dashboard'
                ? 'bg-purple-600 font-medium'
                : 'hover:bg-purple-600/50'
            }`}
          >
            {isSidebarCollapsed ? "H" : "Home"}
          </Link>
          <Link
            href="/events"
            className={`w-full block text-left px-4 py-3 rounded-lg transition-colors ${
              pathname === '/events'
                ? 'bg-purple-600 font-medium'
                : 'hover:bg-purple-600/50'
            }`}
          >
            {isSidebarCollapsed ? "E" : "Events"}
          </Link>
          <Link
            href="/dashboard/settings"
            className={`w-full block text-left px-4 py-3 rounded-lg transition-colors ${
              pathname === '/dashboard/settings'
                ? 'bg-purple-600 font-medium'
                : 'hover:bg-purple-600/50'
            }`}
          >
            {isSidebarCollapsed ? "S" : "Settings"}
          </Link>
        </nav>

        {/* Profile Section */}
        <div className="pt-4 border-t border-purple-400/30">
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-400/30 animate-pulse" />
              {!isSidebarCollapsed && (
                <div className="flex-1">
                  <div className="h-4 bg-purple-400/30 rounded animate-pulse mb-2" />
                  <div className="h-3 bg-purple-400/30 rounded animate-pulse w-2/3" />
                </div>
              )}
            </div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white">
                <AvatarFallback className="bg-purple-600 text-white font-semibold">
                  {getInitials(user.first_name, user.last_name)}
                </AvatarFallback>
              </Avatar>
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="text-xs text-purple-100 truncate">
                    {user.email}
                  </div>
                </div>
              )}
            </div>
          ) : (
            !isSidebarCollapsed && (
              <div className="text-sm text-purple-100">Not logged in</div>
            )
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
              <div className="text-3xl font-bold text-foreground2">{summaryStats.present.count}</div>
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
              <div className="text-3xl font-bold text-foreground2">{summaryStats.late.count}</div>
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
              <div className="text-3xl font-bold text-foreground2">{summaryStats.absent.count}</div>
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
              <div className="text-3xl font-bold text-foreground2">{summaryStats.total.count}</div>
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
          {eventId && (
            <>
              <Button 
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setIsAddMemberModalOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
              <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50 bg-transparent">
                <QrCode className="h-4 w-4 mr-2" />
                Generate Token
              </Button>
            </>
          )}
          {!eventId && (
            <div className="text-sm text-muted-foreground">
              Select an event to manage members
            </div>
          )}
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
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingMembers ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading members...
                    </TableCell>
                  </TableRow>
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {eventId ? "No members added yet. Click 'Add Member' to get started." : "Select an event to view members."}
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => (
                    <TableRow key={member.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-purple-500 text-white">
                              {getInitials(member.first_name, member.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-foreground2">
                              {member.first_name} {member.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatStudentId(member.id)}
                      </TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>
                        <Badge className="bg-gray-500 hover:bg-gray-600">
                          Not Checked In
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">—</TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => handleDeleteMemberClick(member, e)}
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
  )
}

