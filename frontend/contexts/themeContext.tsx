'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  // Fetch theme from backend when user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserSettings();
    }
  }, []);

  const fetchUserSettings = async () => {
    try {
      const response = await apiClient.getUserSettings();
      if (response.data) {
        setTheme(response.data.display_theme as Theme);
      }
    } catch (error) {
      console.error('Failed to fetch user settings:', error);
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');

    // Update backend if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      updateUserSettings(newTheme);
    }
  };

  const updateUserSettings = async (theme: Theme) => {
    try {
      await apiClient.updateUserSettings(theme);
    } catch (error) {
      console.error('Failed to update user settings:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
