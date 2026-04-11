"use client";

import { Button } from "@/components/ui/button";
import { PanelLeft, User, Shield, Trophy, Home, Calendar, Users, Cog, LogOut, type LucideIcon } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";


const tabs: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/settings", label: "User Settings", icon: User },
  { href: "/settings/security", label: "Security", icon: Shield },
  { href: "/settings/achievements", label: "Achievements", icon: Trophy },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [lastEventName, setLastEventName] = useState<string | null>(null);

  useEffect(() => {
    setLastEventId(localStorage.getItem("lastEventId"));
    setLastEventName(localStorage.getItem("lastEventName"));
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await apiClient.getCurrentUser();
        if (!response.data?.data) router.push("/sign-in");
      } catch {
        router.push("/sign-in");
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = () => {
    apiClient.logout();
    router.replace("/sign-in");
    router.refresh();
  };

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="flex min-h-screen bg-background2">
      {/* Sidebar */}
      <aside
        className={`bg-[var(--sidebar)] text-[var(--sidebar-foreground)] flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "w-20 px-4 py-6" : "w-64 p-6"
        }`}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
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

        {lastEventName ? (
          isSidebarCollapsed ? (
            <div className="mb-6 flex justify-center overflow-hidden">
              <span
                className="text-xs font-medium text-white/60 truncate text-center w-full">
                {lastEventName}
              </span>
            </div>
          ) : (
            <div className="mb-6 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/40 mb-0.5">Selected Event</p>
              <p className="text-sm font-medium truncate">{lastEventName}</p>
            </div>
          )
        ) : (
          isSidebarCollapsed && <div className="mb-8" />
        )}

        <nav className="flex-1 space-y-2">
          {[
            { href: lastEventId ? `/dashboard?eventId=${lastEventId}` : "/dashboard", label: "Event Dashboard", icon: Home, match: (p: string) => p === "/dashboard" },
            { href: "/events", label: lastEventId ? "Change Event" : "Events", icon: Calendar, match: (p: string) => p === "/events" },
            ...(lastEventId ? [{ href: `/participation?eventId=${lastEventId}`, label: "Participation", icon: Users, match: (p: string) => p.startsWith("/participation") }] : []),
            { href: "/settings", label: "Settings", icon: Cog, match: (p: string) => p.startsWith("/settings") },
          ].map(({ href, label, icon: Icon, match }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                match(pathname)
                  ? "bg-[var(--sidebar-accent)] font-medium"
                  : "hover:bg-[var(--sidebar-accent)]/50"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isSidebarCollapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="pt-4 border-t border-[var(--sidebar-border)]/30">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-sm font-medium opacity-90 hover:bg-red-500/20 hover:text-red-400 transition"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!isSidebarCollapsed && "Logout"}
          </button>
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

        {/* Tab Nav */}
        <div className="border-b border-border mb-6">
          <nav className="flex gap-1">
            {tabs.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-foreground2 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Page Content */}
        <div className="max-w-3xl space-y-6">{children}</div>
      </main>
    </div>
  );
}
