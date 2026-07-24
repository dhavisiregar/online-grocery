"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api, ApiError } from "@/lib/api";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { formatIDR } from "@/lib/format";
import { ORDER_STATUS_LABEL, type Order, type Pagination } from "@/types";

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
      <h1 className="text-2xl font-bold">Pesanan Saya</h1>

      <input
        type="search"
        placeholder="Cari berdasarkan nomor pesanan…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm"
      />

      {error && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      )}

      {!error && orders && orders.length === 0 && (
        <p className="mt-10 text-center text-sm text-foreground/60">Belum ada pesanan.</p>
      )}

      {!error && orders && orders.length > 0 && (
        <div className="mt-6 flex flex-col divide-y divide-border rounded-xl border border-border">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center justify-between gap-4 p-4 text-sm hover:bg-surface"
            >
              <div>
                <p className="font-medium">{order.order_number}</p>
                <p className="text-foreground/60">{ORDER_STATUS_LABEL[order.status]}</p>
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
