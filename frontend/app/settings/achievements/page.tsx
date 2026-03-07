"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Trophy,
  UserCheck,
  Sunrise,
  Calendar,
  Lock,
  type LucideIcon,
  Dog,
  Medal,
  Repeat,
} from "lucide-react"
import { apiClient } from "@/lib/api"

interface AchievementMeta {
  id: string
  title: string
  description: string
  icon: LucideIcon
  iconColor: string
  iconBg: string
}

interface Achievement extends AchievementMeta {
  earned: boolean
}

const ACHIEVEMENT_META: AchievementMeta[] = [
  {
    id: "first-steps",
    title: "First Steps",
    description: "Complete your first check-in",
    icon: UserCheck,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
  },
  {
    // streak tracker that resets on miss
    id: "on-time",
    title: "On Time",
    description: "Check in on time 3 times in a row",
    icon: Sunrise,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
  },
  {
    // track account age at check-in
    id: "loyal-member",
    title: "Loyal Member",
    description: "Account active for 30+ days",
    icon: Calendar,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
  },
  {
    // needs some way to "end" event to get stats at end of event
    id: "good-boy",
    title: "Good Boy",
    description: "Achieve 100% attendance at an event",
    icon: Dog,
    iconColor: "text-yellow-500",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/40",
  },
  {
    id: "Leader",
    title: "Leader",
    description: "Be an admin for an event",
    icon: Repeat,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
  },
  {
    id: "goat",
    title: "Goat",
    description: "#1 in attendance for an event",
    icon: Medal,
    iconColor: "text-rose-500",
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
  },
]

function AchievementTile({ title, description, icon: Icon, earned, iconColor, iconBg }: Achievement) {
  return (
    <div
      className={`flex flex-col items-center text-center p-4 rounded-xl border bg-card gap-2 transition-opacity ${
        earned ? "opacity-100" : "opacity-50"
      }`}
    >
      <div className={`relative h-14 w-14 rounded-full flex items-center justify-center ${earned ? iconBg : "bg-muted"}`}>
        <Icon className={`h-7 w-7 ${earned ? iconColor : "text-muted-foreground"}`} />
        {!earned && (
          <div className="absolute -bottom-1 -right-1 h-5 w-5">
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="font-medium text-sm leading-tight">{title}</div>
      <div className="text-xs text-muted-foreground leading-tight">{description}</div>
      {earned ? (
        <Badge className="text-xs mt-auto">Earned</Badge>
      ) : (
        <Badge variant="outline" className="text-xs mt-auto text-muted-foreground">
          Locked
        </Badge>
      )}
    </div>
  )
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>(
    ACHIEVEMENT_META.map((m) => ({ ...m, earned: false }))
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAchievements() {
      try {
        const res = await apiClient.getAchievements()
        if (res.data?.data) {
          const earnedMap = new Map(res.data.data.map((a) => [a.id, a.earned]))
          setAchievements(
            ACHIEVEMENT_META.map((meta) => ({
              ...meta,
              earned: earnedMap.get(meta.id) ?? false,
            }))
          )
        }
      } catch (error) {
        console.error("Failed to fetch achievements:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchAchievements()
  }, [])

  const earnedCount = achievements.filter((a) => a.earned).length

  if (loading) {
    return <div className="text-gray-500 text-sm">Loading achievements...</div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <CardTitle>Achievements</CardTitle>
        </div>
        <CardDescription>
          {earnedCount} of {achievements.length} achievements earned
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {achievements.map((achievement) => (
            <AchievementTile key={achievement.id} {...achievement} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
