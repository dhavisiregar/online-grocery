"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api, ApiError } from "@/lib/api";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { formatIDR } from "@/lib/format";
import type { Order, Pagination } from "@/types";

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersContent />
    </RequireAuth>
  );
}

function OrdersContent() {
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: Order[]; pagination: Pagination }>("/api/orders", { query: { search: search || undefined } })
      .then((res) => {
        setOrders(res.items);
        setPagination(res.pagination);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat pesanan"));
  }, [search]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Pesanan Saya</h1>

      <input
        type="search"
        placeholder="Cari berdasarkan nomor pesanan…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full max-w-sm rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-shadow placeholder:text-foreground/40 focus:border-brand focus:ring-2 focus:ring-brand/25"
      />

      {error && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      )}

      {!error && orders && orders.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <span aria-hidden className="text-4xl">
            🧾
          </span>
          <p className="text-sm text-foreground/60">Belum ada pesanan.</p>
        </div>
      )}

      {!error && orders && orders.length > 0 && (
        <div className="mt-6 flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background shadow-soft">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center justify-between gap-4 p-4 text-sm transition-colors hover:bg-surface"
            >
              <div className="flex flex-col gap-1.5">
                <p className="font-semibold">{order.order_number}</p>
                <OrderStatusBadge status={order.status} />
              </div>
              <span className="font-semibold">{formatIDR(order.total)}</span>
            </Link>
          ))}
        </div>
      )}

      {pagination && pagination.total > pagination.limit && (
        <p className="mt-4 text-center text-xs text-foreground/50">
          Menampilkan {orders?.length ?? 0} dari {pagination.total} pesanan
        </p>
      )}
    </div>
  );
}
