'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api, { saveToken, clearToken } from '@/lib/api';

interface User {
  id: string;
  name: string;
  role: 'user' | 'admin';
  storage_quota: number;
  storage_used: number;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (user: User, token?: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    clearToken();
    setUser(null);
    window.location.href = '/login';
  }, []);

  // Inactivity auto-logout
  useEffect(() => {
    if (!user) return;

    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousemove', 'keypress', 'scroll', 'click', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [user, logout]);

  // Restore session on mount
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch (_) {
        // Only clear user if not already set (e.g. freshly logged in via login())
        setUser((prev) => prev ?? null);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const login = (userData: User, token?: string) => {
    if (token) saveToken(token);
    setUser(userData);
  };

  const refreshUser = async (): Promise<boolean> => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
