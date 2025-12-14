'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await apiClient.getCurrentUser();
        // Backend returns {"data": user}, API client wraps it as {data: {data: user}}
        const userData = response.data?.data;
        if (userData) {
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: '🏠' },
    { name: 'Events', path: '/events', icon: '📅' },
    { name: 'Settings', path: '/dashboard/settings', icon: '⚙️' },
  ];

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <aside className="w-64 bg-purple-500 text-white flex flex-col">
      <div className="p-6 border-b border-purple-400/30">
        <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="VeriFace Logo" className="h-10 w-auto" />
          <h2 className="text-xl font-bold">VeriFace</h2>
        </Link>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    isActive
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'text-purple-100 hover:bg-purple-600/50 hover:text-white'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Profile Section */}
      <div className="p-4 border-t border-purple-400/30">
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-400/30 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 bg-purple-400/30 rounded animate-pulse mb-2" />
              <div className="h-3 bg-purple-400/30 rounded animate-pulse w-2/3" />
            </div>
          </div>
        ) : user ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white">
              <AvatarFallback className="bg-purple-600 text-white font-semibold">
                {getInitials(user.first_name, user.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-xs text-purple-100 truncate">
                {user.email}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-purple-100">Not logged in</div>
        )}
      </div>
    </aside>
  );
}