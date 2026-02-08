"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PanelLeft, User, Palette } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"
import { ThemeToggle } from "@/components/ui/themeToggle"

interface User {
  id: number
  first_name: string
  last_name: string
  email: string
}

export default function SettingsPage() {
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await apiClient.getCurrentUser()
        const userData = response.data?.data
        if (userData) {
          setUser(userData)
        } else {
          // Redirect to sign-in if not authenticated
          router.push('/sign-in')
        }
      } catch (error) {
        console.error('Failed to fetch user:', error)
        router.push('/sign-in')
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [router])

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const formatUserId = (id: number) => {
    return `${String(id).padStart(6, '0')}`
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background2">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    )
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
            href="/settings"
            className={`w-full block text-left px-4 py-3 rounded-lg transition-colors ${
              pathname === '/settings'
                ? 'bg-purple-600 font-medium'
                : 'hover:bg-purple-600/50'
            }`}
          >
            {isSidebarCollapsed ? "S" : "Settings"}
          </Link>
        </nav>

        {/* Profile Section */}
        <div className="pt-4 border-t border-purple-400/30">
          {user ? (
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
            <h1 className="text-2xl font-bold text-foreground2">Settings</h1>
          </div>
        </div>

        {/* Settings Content */}
        <div className="max-w-3xl space-y-6">
          {/* User Information Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" />
                <CardTitle>User Information</CardTitle>
              </div>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20 border-4 border-purple-500">
                  <AvatarFallback className="bg-purple-600 text-white font-semibold text-2xl">
                    {user && getInitials(user.first_name, user.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div className="text-lg font-medium">
                      {user?.first_name} {user?.last_name}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <div className="text-base">{user?.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">User ID</div>
                    <div className="text-base font-mono">{user && formatUserId(user.id)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-purple-600" />
                <CardTitle>Appearance</CardTitle>
              </div>
              <CardDescription>Customize how VeriFace looks on your device</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Theme</div>
                  <div className="text-sm text-gray-500">
                    Choose between light and dark mode
                  </div>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
