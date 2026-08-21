"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { api, getToken } from "@/lib/api";
import type { Notification } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const POLL_INTERVAL_MS = 30000;
const MAX_RECENT = 10;

interface NotificationContextValue {
  unreadCount: number;
  recent: Notification[];
  connected: boolean;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Connects to the SSE stream while logged in (GET /api/notifications/stream)
// for live push, and falls back to polling List/UnreadCount every 30s if
// the stream can't be reached at all, drops mid-session, or the browser
// doesn't support EventSource. Either path keeps unreadCount/recent — the
// navbar bell's badge and dropdown — up to date.
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);

  const esRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api<{ unread_count: number }>("/api/notifications/unread-count");
      setUnreadCount(res.unread_count);
    } catch {
      // Leave whatever we last knew rather than flashing to 0.
    }
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await api<{ items: Notification[] }>("/api/notifications", { query: { limit: MAX_RECENT } });
      setRecent(res.items);
    } catch {
      // ignore
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchUnreadCount(), fetchRecent()]);
  }, [fetchUnreadCount, fetchRecent]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      queueMicrotask(refresh);
    }, POLL_INTERVAL_MS);
  }, [refresh]);

  useEffect(() => {
    if (!user) {
      esRef.current?.close();
      esRef.current = null;
      stopPolling();
      // Deferred so these state updates run from an async callback rather
      // than synchronously during the effect itself.
      queueMicrotask(() => {
        setUnreadCount(0);
        setRecent([]);
        setConnected(false);
      });
      return;
    }

    queueMicrotask(refresh);

    const token = getToken();
    if (!token || typeof window === "undefined" || typeof EventSource === "undefined") {
      startPolling();
      return stopPolling;
    }

    const es = new EventSource(`${API_URL}/api/notifications/stream?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      stopPolling();
      // Resync in case anything was missed between the last poll (if any
      // ran while disconnected) and this reconnect.
      queueMicrotask(refresh);
    };

    es.addEventListener("notification", (event) => {
      try {
        const notif: Notification = JSON.parse((event as MessageEvent).data);
        setRecent((prev) => [notif, ...prev].slice(0, MAX_RECENT));
        if (!notif.is_read) setUnreadCount((prev) => prev + 1);
      } catch {
        // malformed payload; ignore
      }
    });

    es.onerror = () => {
      // The browser's EventSource keeps retrying on its own, but while
      // it's down (or if it never connects — blocked network/proxy) fall
      // back to polling so unread count/list still stay current.
      setConnected(false);
      startPolling();
    };

    return () => {
      es.close();
      esRef.current = null;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const markAsRead = useCallback(async (id: number) => {
    setRecent((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await api(`/api/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      // Best-effort — a stale count self-corrects on the next refresh/poll.
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setRecent((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await api("/api/notifications/read-all", { method: "PATCH" });
    } catch {
      // best-effort
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, recent, connected, markAsRead, markAllAsRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
