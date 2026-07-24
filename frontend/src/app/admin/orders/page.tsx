"use client";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { StatusNotice } from "@/components/admin/StatusNotice";
import { ORDER_STATUS_LABEL, type Order } from "@/types";
import { formatIDR } from "@/lib/format";

export default function AdminOrdersPage() {
  const { items, error, loading } = usePaginatedApi<Order>("/api/admin/orders");

  return (
    <div>
      <h1 className="text-xl font-bold">Pesanan</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Super admin melihat semua toko; store admin hanya melihat pesanan toko masing-masing.
      </p>

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
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3">{o.order_number}</td>
                  <td className="p-3">{ORDER_STATUS_LABEL[o.status]}</td>
                  <td className="p-3">{formatIDR(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
