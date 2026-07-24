"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { formatIDR } from "@/lib/format";
import { ORDER_STATUS_LABEL, type Order } from "@/types";
import { PaymentProofUpload } from "@/components/order/PaymentProofUpload";

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
    return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-foreground/60">Memuat…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">{order.order_number}</h1>
      <p className="mt-1 text-sm text-brand-dark">{ORDER_STATUS_LABEL[order.status]}</p>

      <div className="mt-6 rounded-xl border border-border p-6">
        <div className="flex justify-between text-sm">
          <span className="text-foreground/60">Subtotal</span>
          <span>{formatIDR(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground/60">Diskon</span>
          <span>-{formatIDR(order.discount_amount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground/60">Ongkos Kirim</span>
          <span>{formatIDR(order.shipping_cost)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold">
          <span>Total</span>
          <span>{formatIDR(order.total)}</span>
        </div>
      </div>

      {order.status === "waiting_payment" && (
        <div className="mt-6 flex flex-col gap-3">
          <PaymentProofUpload orderId={params.id} onUploaded={load} />
          <button
            type="button"
            onClick={() => runAction("cancel")}
            className="text-sm text-red-600 underline"
          >
            Batalkan Pesanan
          </button>
        </div>
      )}

      {order.status === "shipped" && (
        <button
          type="button"
          onClick={() => runAction("confirm")}
          className="mt-6 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Konfirmasi Pesanan Diterima
        </button>
      )}

      {actionMessage && <p className="mt-3 text-sm text-red-600">{actionMessage}</p>}
    </div>
  );
}
