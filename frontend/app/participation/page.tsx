"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PanelLeft } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useEvents } from "@/lib/hooks/useEvents";
import { ColdCallWheel } from "./components/ColdCallWheel";

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
}

interface EventMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status?: "present" | "late";
}

export default function ParticipationPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { events, loading: loadingEvents } = useEvents();

  const eventId = searchParams?.get("eventId")
    ? parseInt(searchParams.get("eventId")!, 10)
    : null;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [wheelMembers, setWheelMembers] = useState<EventMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [latestSessionLabel, setLatestSessionLabel] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    apiClient.logout();
    router.replace("/sign-in");
    router.refresh();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

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
        } else {
          router.push("/sign-in");
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
        router.push("/sign-in");
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [router]);

  useEffect(() => {
    async function fetchWheelMembers() {
      if (!eventId) {
        setWheelMembers([]);
        setLatestSessionLabel(null);
        return;
      }
      setLoadingMembers(true);
      try {
        const sessionsRes = await apiClient.getSessions(eventId);
        const sessions = sessionsRes.data?.sessions ?? [];
        if (sessions.length === 0) {
          setWheelMembers([]);
          setLatestSessionLabel(null);
          return;
        }
        const latestSession = [...sessions].sort(
          (a, b) => b.sequence_number - a.sequence_number
        )[0];
        setLatestSessionLabel(`Session ${latestSession.sequence_number}`);

        const attendanceRes = await apiClient.getSessionAttendance(
          latestSession.id
        );
        const attendance = attendanceRes.data?.attendance ?? [];
        const presentOrLate = attendance.filter(
          (r) => r.status === "present" || r.status === "late"
        );
        const members: EventMember[] = presentOrLate.map((r) => ({
          id: r.user_id,
          first_name: r.first_name,
          last_name: r.last_name,
          email: r.email,
          status: r.status as "present" | "late",
        }));
        setWheelMembers(members);
      } catch (error) {
        setWheelMembers([]);
        setLatestSessionLabel(null);
      } finally {
        setLoadingMembers(false);
      }
    }
    fetchWheelMembers();
  }, [eventId]);

  const handleEventSelect = (id: number) => {
    router.push(`/participation?eventId=${id}`);
  };

  const selectedEvent = events.find((e) => e.id === eventId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background2 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen bg-background2 participation-page ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
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
            href={eventId ? `/dashboard?eventId=${eventId}` : "/dashboard"}
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
            href={eventId ? `/participation?eventId=${eventId}` : "/participation"}
            className={`w-full block text-left px-4 py-3 rounded-lg transition-colors ${
              pathname?.startsWith("/participation")
                ? "bg-[var(--sidebar-accent)] font-medium"
                : "hover:bg-[var(--sidebar-accent)]/50"
            }`}
          >
            {isSidebarCollapsed ? "P" : "Participation"}
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

        <div className="pt-4 border-t border-[var(--sidebar-border)]/30">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 rounded-lg text-sm font-medium opacity-90 hover:bg-red-500/20 hover:text-red-400 transition"
          >
            Logout
          </button>
          {user && (
            <div className="flex items-center gap-3 mt-4">
              <Avatar className="h-10 w-10 border-2 border-white">
                {avatarSignedUrl && <AvatarImage src={avatarSignedUrl} alt="Avatar" />}
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
          )}
        </div>
      </aside>

      {/* Main Content - atmospheric gradient background */}
      <main className="flex-1 p-6 min-h-screen font-[var(--font-inter)] relative participation-main">
        {/* Sidebar toggler - anchored top-left in header area */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-[18px] top-[18px] z-[60] rounded-full shrink-0 h-9 w-9"
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeft
            className={`h-5 w-5 transition-transform duration-300 ${
              isSidebarCollapsed ? "rotate-180" : ""
            }`}
          />
        </Button>

        <div className="max-w-[1100px] mx-auto pt-12">
          {/* Header: title + metadata grouped left */}
          <div className="mb-8">
            <h1 className="text-[26px] font-semibold text-foreground2 tracking-tight">
              {eventId ? "Cold Calling Wheel" : "Cold Calling"}
            </h1>
            {eventId && selectedEvent && latestSessionLabel && (
              <p className="text-[14px] text-muted-foreground mt-0.5">
                {selectedEvent.event_name} · {latestSessionLabel}
              </p>
            )}
          </div>

        {!eventId ? (
          <Card className="bg-white dark:bg-[#1a1a1a] shadow-sm">
            <CardContent className="py-6 px-6">
              <h2 className="text-[18px] font-semibold mb-4">Select an Event</h2>
              <p className="text-[14px] text-muted-foreground mb-6">
                Choose an event to use the cold calling wheel with its members.
              </p>
              {loadingEvents ? (
                <div className="text-muted-foreground">Loading events...</div>
              ) : events.length === 0 ? (
                <div className="text-muted-foreground">
                  No events yet. Create an event from the Events page first.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map((event) => (
                    <Card
                      key={event.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleEventSelect(event.id)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground2">
                          {event.event_name}
                        </h3>
                        {event.location && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.location}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <ColdCallWheel
            members={wheelMembers}
            loading={loadingMembers}
            eventName={selectedEvent?.event_name}
            sessionLabel={latestSessionLabel}
          />
        )}
        </div>
      </main>
    </div>
  );
}
