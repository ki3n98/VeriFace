"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { User, Palette, Upload } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"
import { ThemeToggle } from "@/components/ui/themeToggle"

interface UserData {
  id: number
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
}

export default function UserSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await apiClient.getCurrentUser()
        const userData = response.data?.data
        if (userData) {
          setUser(userData)
          if (userData.avatar_url) {
            const urlRes = await apiClient.getAvatarUrl()
            setAvatarSignedUrl(urlRes.data?.signed_url ?? null)
          }
        } else {
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

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await apiClient.uploadAvatar(file)
      if (res.error) {
        alert(res.error)
      } else if (res.data?.signed_url) {
        setAvatarSignedUrl(res.data.signed_url)
      }
    } catch (error) {
      console.error('Avatar upload failed:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const formatUserId = (id: number) => {
    return `${String(id).padStart(6, '0')}`
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>
  }

  return (
    <>
      {/* User Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>User Information</CardTitle>
          </div>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-20 w-20 border-4 border-primary">
                {avatarSignedUrl && <AvatarImage src={avatarSignedUrl} alt="Avatar" />}
                <AvatarFallback className="bg-primary text-white font-semibold text-2xl">
                  {user && getInitials(user.first_name, user.last_name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
              >
                <Upload className="h-3 w-3" />
                {uploading ? "Uploading..." : "Change photo"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
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
            <Palette className="h-5 w-5 text-primary" />
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
    </>
  )
}
