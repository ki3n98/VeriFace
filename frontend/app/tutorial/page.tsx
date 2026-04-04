"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PanelLeft, Home, Calendar, Cog, LogOut, Users, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
}

const VIDEOS = [
  {
    id: "intro",
    title: "Getting Started",
    audience: "Everyone",
    audienceColor: "bg-blue-600",
    description:
      "An overview of the VeriFace platform — how to navigate, key features, how to get started, and how to join an event.",
    // Replace with actual YouTube video ID when ready
    youtubeId: null as string | null,
  },
  {
    id: "admin",
    title: "Owner Guide",
    audience: "Owners",
    audienceColor: "bg-purple-700",
    description:
      "A walkthrough of the dashboard for owners — session creation, starting a session, managing breakout rooms, and tracking attendance.",
    youtubeId: null as string | null,
  },
  {
    id: "student",
    title: "Student Guide",
    audience: "Students",
    audienceColor: "bg-emerald-600",
    description:
      "A walkthrough of the student experience — how to check in, view your attendance status, and navigate breakout rooms.",
    youtubeId: null as string | null,
  },
];

export default function TutorialPage() {
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);

  const handleLogout = () => {
    apiClient.logout();
    router.replace("/sign-in");
    router.refresh();
  };

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

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
              href: "/participation",
              label: "Participation",
              icon: Users,
              match: (p: string) => p?.startsWith("/participation"),
            },
            {
              href: "/settings",
              label: "Settings",
              icon: Cog,
              match: (p: string) => p?.startsWith("/settings"),
            },
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
                {avatarSignedUrl && (
                  <AvatarImage src={avatarSignedUrl} alt="Avatar" />
                )}
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
            !isSidebarCollapsed && (
              <div className="text-sm opacity-90">Not logged in</div>
            )
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
            <h1 className="text-2xl font-bold text-foreground">Tutorials</h1>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Video Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {VIDEOS.map((video) => (
            <Card key={video.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${video.audienceColor}`}
                  >
                    {video.audience}
                  </span>
                </div>
                <CardTitle className="text-lg">{video.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{video.description}</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end">
                {video.youtubeId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${video.youtubeId}`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full aspect-video rounded-lg border border-border"
                  />
                ) : (
                  <div className="w-full aspect-video rounded-lg border border-dashed border-border bg-muted flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Video coming soon</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
