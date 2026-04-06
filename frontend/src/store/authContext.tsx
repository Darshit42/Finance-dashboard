import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { authApi } from '../api/auth';

function readStoredUser(): User | null {
  try {
    const stored = localStorage.getItem('fb_user');
    return stored ? (JSON.parse(stored) as User) : null;
  } catch {
    localStorage.removeItem('fb_user');
    return null;
  }
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('fb_token'));
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem('fb_token')));

  const logout = useCallback(() => {
    localStorage.removeItem('fb_token');
    localStorage.removeItem('fb_user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const t = localStorage.getItem('fb_token');
    setToken(t);
    if (!t) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    authApi
      .me()
      .then((me) => {
        setUser(me);
        localStorage.setItem('fb_user', JSON.stringify(me));
      })
      .catch(() => {
        logout();
      })
      .finally(() => setIsLoading(false));
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { access_token } = await authApi.login(email, password);
      localStorage.setItem('fb_token', access_token);
      setToken(access_token);
      const me = await authApi.me();
      setUser(me);
      localStorage.setItem('fb_user', JSON.stringify(me));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
