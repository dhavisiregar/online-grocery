"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useNotifications } from "@/contexts/NotificationContext";
import type { Notification, Pagination } from "@/types";

const TYPE_ICON: Record<Notification["type"], string> = {
  order_status: "📦",
  promo: "🏷️",
  system: "ℹ️",
};

export default function NotificationsPage() {
  return (
    <RequireAuth redirectToLogin>
      <NotificationsContent />
    </RequireAuth>
  );
}

function NotificationsContent() {
  const router = useRouter();
  const { markAsRead, markAllAsRead } = useNotifications();

  const [items, setItems] = useState<Notification[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    api<{ items: Notification[]; pagination: Pagination }>("/api/notifications", { query: { page, limit: 15 } })
      .then((res) => {
        setItems(res.items);
        setPagination(res.pagination);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat notifikasi"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // Deferred so the state updates run from an async callback rather than
    // synchronously during the effect itself.
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function handleClick(n: Notification) {
    if (!n.is_read) {
      await markAsRead(n.id);
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)) ?? null);
    }
    if (n.type === "order_status" && n.related_id) {
      router.push(`/orders/${n.related_id}`);
    } else if (n.type === "promo" && n.related_id) {
      router.push(`/products/${n.related_id}`);
    }
  }

  async function handleMarkAllRead() {
    await markAllAsRead();
    setItems((prev) => prev?.map((x) => ({ ...x, is_read: true })) ?? null);
  }

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;
  const hasUnread = items?.some((n) => !n.is_read) ?? false;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Notifikasi</h1>
        {hasUnread && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-sm font-medium text-brand-dark hover:underline"
          >
            Tandai semua sudah dibaca
          </button>
        )}
      </div>

      {loading && <NotificationsSkeleton />}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>
      )}

      {!loading && !error && items && items.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <span aria-hidden className="text-4xl">
            🔔
          </span>
          <p className="text-foreground/60">Belum ada notifikasi.</p>
        </div>
      )}

      {!loading && !error && items && items.length > 0 && (
        <div className="mt-6 flex flex-col gap-2">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={`flex items-start gap-3 rounded-2xl border border-border p-4 text-left shadow-soft transition-colors hover:bg-surface ${
                n.is_read ? "bg-background" : "bg-brand-light/30"
              }`}
            >
              <span aria-hidden className="text-xl">
                {TYPE_ICON[n.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-sm text-foreground/70">{n.body}</p>
                <p className="mt-1 text-xs text-foreground/50">{new Date(n.created_at).toLocaleString("id-ID")}</p>
              </div>
              {!n.is_read && <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />}
            </button>
          ))}
        </div>
      )}

      {pagination && pagination.total > pagination.limit && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="text-foreground/60">
            Halaman <span className="font-semibold text-foreground">{page}</span> dari {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
      ))}
    </div>
  );
}
