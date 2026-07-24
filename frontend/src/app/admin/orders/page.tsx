"use client";

import { useState } from "react";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { StatusNotice } from "@/components/admin/StatusNotice";
import { api, ApiError } from "@/lib/api";
import { ORDER_STATUS_LABEL, type Order } from "@/types";
import { formatIDR } from "@/lib/format";

export default function AdminOrdersPage() {
  const { items, error, loading, reload } = usePaginatedApi<Order>("/api/admin/orders");
  const [actionError, setActionError] = useState<string | null>(null);

  async function runAction(path: string, body?: unknown) {
    setActionError(null);
    try {
      await api(path, { method: "POST", body });
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Aksi gagal");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Pesanan</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Super admin melihat semua toko; store admin hanya melihat pesanan toko masing-masing.
      </p>

      {actionError && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>
      )}

      {!loading && error && (
        <div className="mt-4">
          <StatusNotice message={error} />
        </div>
      )}
      {loading && <p className="mt-4 text-sm text-foreground/60">Memuat…</p>}

      {!loading && !error && items.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-foreground/60">
              <tr>
                <th className="p-3">No. Pesanan</th>
                <th className="p-3">Status</th>
                <th className="p-3">Total</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3">{o.order_number}</td>
                  <td className="p-3">{ORDER_STATUS_LABEL[o.status]}</td>
                  <td className="p-3">{formatIDR(o.total)}</td>
                  <td className="p-3">
                    <OrderActions order={o} onAction={runAction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="mt-10 text-center text-sm text-foreground/50">Belum ada pesanan.</p>
      )}
    </div>
  );
}

function OrderActions({
  order,
  onAction,
}: {
  order: Order;
  onAction: (path: string, body?: unknown) => void;
}) {
  const base = `/api/admin/orders/${order.id}`;
  const cancellable =
    order.status === "waiting_payment" || order.status === "waiting_confirmation" || order.status === "processing";

  if (!cancellable) {
    return <span className="text-foreground/40">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {order.status === "waiting_confirmation" && (
        <>
          <button
            type="button"
            onClick={() => onAction(`${base}/confirm-payment`, { approve: true })}
            className="text-brand-dark hover:underline"
          >
            Setujui
          </button>
          <button
            type="button"
            onClick={() => onAction(`${base}/confirm-payment`, { approve: false })}
            className="text-amber-700 hover:underline"
          >
            Tolak
          </button>
        </>
      )}
      {order.status === "processing" && (
        <button type="button" onClick={() => onAction(`${base}/ship`)} className="text-brand-dark hover:underline">
          Kirim Pesanan
        </button>
      )}
      <button type="button" onClick={() => onAction(`${base}/cancel`)} className="text-red-600 hover:underline">
        Batalkan
      </button>
    </div>
  );
}
