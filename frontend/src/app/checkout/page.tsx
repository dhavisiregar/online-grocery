"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { primaryButtonClass } from "@/components/auth/AuthCard";

// Structural shell for checkout: address selection, shipping method, and
// payment method each need their own endpoints (see AddressHandler and the
// shipping-cost integration in the spec) before this can go live end to end.
// The order submission wiring below is already in place.
export default function CheckoutPage() {
  return (
    <RequireAuth requireVerified>
      <CheckoutContent />
    </RequireAuth>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const [addressId, setAddressId] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState("manual_transfer");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const order = await api<{ id: number }>("/api/orders", {
        method: "POST",
        body: { address_id: addressId || undefined, payment_method: paymentMethod },
      });
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Gagal membuat pesanan");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Checkout</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        <Section title="Alamat Pengiriman">
          <p className="text-sm text-foreground/60">
            Pilih alamat pengiriman Anda. Belum ada alamat tersimpan? Tambahkan alamat baru dari
            halaman profil terlebih dahulu.
          </p>
          <input
            type="number"
            placeholder="ID Alamat (sementara)"
            value={addressId}
            onChange={(e) => setAddressId(e.target.value ? Number(e.target.value) : "")}
            className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </Section>

        <Section title="Metode Pembayaran">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="manual_transfer">Transfer Manual</option>
            <option value="payment_gateway">Payment Gateway</option>
          </select>
        </Section>

        {status === "error" && message && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {message}
          </p>
        )}

        <button type="submit" disabled={status === "loading"} className={primaryButtonClass}>
          {status === "loading" ? "Memproses…" : "Buat Pesanan"}
        </button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-6">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
