"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api, ApiError, getToken, setToken } from "@/lib/api";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api<User>("/api/auth/me");
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred so refresh()'s state updates run from an async callback
    // rather than synchronously during the effect itself.
    queueMicrotask(() => {
      refresh();
    });
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    setToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
