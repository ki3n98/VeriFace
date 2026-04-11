"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, X, Image as ImageIcon, Home, Calendar, Cog, LogOut, Users } from "lucide-react";
import { CreateEventModal } from "./components/CreateEventModal";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useEvents } from "@/lib/hooks/useEvents";
import { apiClient } from "@/lib/api";
import { getRoleLabel, getRoleSoftBadgeClass } from "@/lib/eventRoles";

interface EventCreateResponse {
  id: number;
  event_name: string;
  user_id: number;
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
}

interface User {
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
}

export default function EventsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { events, loading, error, refetch } = useEvents();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [lastEventId, setLastEventId] = useState<number | null>(null);
  const [lastEventName, setLastEventName] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("lastEventId");
    if (saved) setLastEventId(parseInt(saved, 10));
    setLastEventName(localStorage.getItem("lastEventName"));
  }, []);

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
      } catch {
        // silently fail — sidebar profile is non-critical
      } finally {
        setLoadingUser(false);
      }
    }
    fetchUser();
  }, []);

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

  const handleEventClick = (eventId: number, role: string) => {
    router.push(`/dashboard?eventId=${eventId}&role=${role}`);
  };

  const handleLogout = () => {
    apiClient.logout();
    router.replace("/sign-in");
    router.refresh();
  };

  const handleCreateEvent = async (eventData: {
    name: string;
    location?: string;
    participantCount?: number;
    description?: string;
    csvFile?: File | null;
  }) => {
    try {
      const response = await apiClient.post<EventCreateResponse>(
        "/protected/event/createEvent",
        {
          event_name: eventData.name,
          location: eventData.location,
          start_date: null,
          end_date: null,
        },
      );

      if (response.error) {
        alert(`Failed to create event: ${response.error}`);
        return;
      }

      const eventId = response.data?.id;
      if (!eventId) {
        alert("Event created but could not get event ID");
        return;
      }

      if (eventData.csvFile && eventId) {
        try {
          const csvResponse = await apiClient.uploadCSV(eventId, eventData.csvFile);
          if (csvResponse.error) {
            alert(`Event created successfully, but CSV upload failed: ${csvResponse.error}`);
          } else {
            const csvData = csvResponse.data;
            if (!csvData) {
              alert("Event created, but CSV upload returned no data.");
            } else if (csvData.success) {
              alert(`Event created and ${csvData.total_rows} members added successfully!`);
            } else {
              alert(`Event created, but CSV upload had errors: ${csvData.message}`);
            }
          }
        } catch (csvError) {
          console.error("Error uploading CSV:", csvError);
          alert("Event created successfully, but CSV upload failed. You can upload it later.");
        }
      }

      try {
        await refetch();
      } catch (refetchError) {
        console.error("Error refreshing events list:", refetchError);
      }
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    }
  };

  const handleDeleteEventClick = (eventId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEventToDelete(eventId);
  };

  const handleConfirmDeleteEvent = async () => {
    if (eventToDelete === null) return;
    setIsDeleting(true);
    try {
      const response = await apiClient.removeEvent(eventToDelete);
      if (response.error) {
        alert(`Failed to delete event: ${response.error}`);
        throw new Error(response.error);
      }
      await refetch();
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  const navLinks = [
    { href: "/dashboard", label: "Event Dashboard", icon: Home, match: (p: string) => p === "/dashboard" },
    { href: "/events", label: "Manage Events", icon: Calendar, match: (p: string) => p === "/events" },
    ...(lastEventId ? [{ href: `/participation?eventId=${lastEventId}`, label: "Participation", icon: Users, match: (p: string) => p?.startsWith("/participation") }] : []),
    { href: "/settings", label: "Settings", icon: Cog, match: (p: string) => p?.startsWith("/settings") },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background2">
      {/* Sidebar */}
      <aside className="bg-[var(--sidebar)] text-[var(--sidebar-foreground)] flex flex-col w-64 p-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <img src="/logo.png" alt="VeriFace Logo" className="h-8 w-auto" />
          </div>
          <span className="text-xl font-bold whitespace-nowrap">VeriFace</span>
        </Link>

        {lastEventName && (
          <div className="mb-6 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-white/40 mb-0.5">Selected Event</p>
            <p className="text-sm font-medium truncate">{lastEventName}</p>
          </div>
        )}

        <nav className="flex-1 space-y-2">
          {navLinks.map(({ href, label, icon: Icon, match }) => (
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
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-sm font-medium opacity-90 hover:bg-red-500/20 hover:text-red-400 transition"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Logout
        </button>

        <div className="p-4 border-t border-[var(--sidebar-border)]/30 space-y-4">
          {loadingUser ? (
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
                <div className="text-xs opacity-60 truncate">{user.email}</div>
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-foreground2 mb-2">Select Event</h2>
          <p className="text-muted-foreground">
            After logging in, users see all classes or events they belong to.
            Users can select an existing event or create a new one.
          </p>
        </div>

        {loading && (
          <div className="text-muted-foreground">Loading events...</div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Error loading events: {error}
          </div>
        )}

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card
              key={event.id}
              className={`cursor-pointer hover:shadow-lg transition-shadow relative group ${event.id === lastEventId ? "ring-2 ring-primary" : ""}`}
              onClick={() => handleEventClick(event.id, event.role)}
            >
              <CardContent className="p-6">
                {event.role === "owner" && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteEventClick(event.id, e)}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-red-500 hover:bg-red-600 text-white"
                    aria-label="Delete event"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                <span
                  className={`absolute top-4 left-4 text-xs font-medium px-2 py-1 rounded-full ${getRoleSoftBadgeClass(event.role)}`}
                >
                  {getRoleLabel(event.role)}
                </span>

                <div className="w-full h-48 bg-muted rounded-lg mb-4 flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground" />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold text-foreground2">
                    {event.event_name}
                  </h3>
                  {event.id === lastEventId && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground whitespace-nowrap">
                      Currently Selected
                    </span>
                  )}
                </div>
                {event.location && (
                  <p className="text-sm text-muted-foreground mb-1">
                    <span className="font-medium">Location:</span> {event.location}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-dashed border-secondary/40 hover:border-secondary"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <CardContent className="p-6 h-full flex flex-col items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-secondary/10 rounded-full mb-4">
                  <Plus className="h-10 w-10 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground2 mb-2">
                  Create Class or Event
                </h3>
                <p className="text-sm text-muted-foreground">
                  Click to add a new event or class
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEvent}
      />

      <DeleteConfirmDialog
        isOpen={eventToDelete !== null}
        onClose={() => setEventToDelete(null)}
        onConfirm={handleConfirmDeleteEvent}
        title="Delete Event"
        message={`Are you sure you want to delete "${events.find((e) => e.id === eventToDelete)?.event_name ?? "this event"}"? This will remove the event and all associated data. This action cannot be undone.`}
        confirmLabel="Delete Event"
        isLoading={isDeleting}
      />
    </div>
  );
}
