"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PageLoader } from "@/components/ui/Spinner";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { formatIDR } from "@/lib/format";
import type { Order } from "@/types";
import { MidtransPayButton } from "@/components/order/MidtransPayButton";

export default function OrderDetailPage() {
  return (
    <RequireAuth>
      <OrderDetailContent />
    </RequireAuth>
  );
}

function OrderDetailContent() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Order>(`/api/orders/${params.id}`)
      .then(setOrder)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat pesanan"));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(path: string) {
    setActionMessage(null);
    try {
      await api(`/api/orders/${params.id}/${path}`, { method: "POST" });
      load();
    } catch (err) {
      setActionMessage(err instanceof ApiError ? err.message : "Aksi gagal");
    }
  }

  if (error) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-foreground/60">{error}</div>;
  }
  if (!order) {
    return <PageLoader />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{order.order_number}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      {order.items && order.items.length > 0 && (
        <div className="mt-6 flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background shadow-soft">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 p-4 text-sm">
              <div>
                <p className="font-medium">{item.product_name}</p>
                <p className="text-foreground/60">
                  {item.quantity} × {formatIDR(item.price)}
                </p>
              </div>
              <span className="font-semibold">{formatIDR(item.subtotal)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-border bg-background p-6 shadow-soft">
        <div className="flex justify-between text-sm">
          <span className="text-foreground/60">Subtotal</span>
          <span>{formatIDR(order.subtotal)}</span>
        </div>
        {order.discount_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-foreground/60">Diskon</span>
            <span className="text-red-600">-{formatIDR(order.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-foreground/60">
            Ongkos Kirim
            {order.shipping_courier && order.shipping_courier !== "internal" && (
              <> ({order.shipping_courier.toUpperCase()} {order.shipping_service})</>
            )}
          </span>
          <span>{formatIDR(order.shipping_cost)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold">
          <span>Total</span>
          <span>{formatIDR(order.total)}</span>
        </div>
      </div>

      {order.status === "waiting_payment" && (
        <div className="mt-6 flex flex-col gap-3">
          <MidtransPayButton orderId={params.id} onSettled={load} />
          <button
            type="button"
            onClick={() => runAction("cancel")}
            className="text-sm font-medium text-red-600 underline-offset-2 hover:underline"
          >
            Batalkan Pesanan
          </button>
        </div>
      )}

      {order.status === "shipped" && (
        <button
          type="button"
          onClick={() => runAction("confirm")}
          className="mt-6 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0"
        >
          Konfirmasi Pesanan Diterima
        </button>
      )}

      {actionMessage && <p className="mt-3 text-sm text-red-600">{actionMessage}</p>}
    </div>
  );
}
