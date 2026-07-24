"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { api, ApiError } from "@/lib/api";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { primaryButtonClass } from "@/components/auth/AuthCard";
import { formatIDR } from "@/lib/format";
import type { CartItem, Order, UserAddress } from "@/types";

interface ShippingOption {
  service: string;
  label: string;
  cost: number;
  eta_days: number;
}

export default function CheckoutPage() {
  return (
    <RequireAuth requireVerified>
      <CheckoutContent />
    </RequireAuth>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[] | null>(null);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [shipping, setShipping] = useState<ShippingOption[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api<CartItem[]>("/api/cart").then(setItems).catch(() => setItems([]));
    api<UserAddress[]>("/api/addresses").then((res) => {
      setAddresses(res);
      const primary = res.find((a) => a.is_primary) ?? res[0];
      if (primary) setAddressId(primary.id);
    }).catch(() => setAddresses([]));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      if (!addressId) {
        setShipping(null);
        return;
      }
      api<ShippingOption[]>(`/api/addresses/${addressId}/shipping-options`)
        .then(setShipping)
        .catch(() => setShipping(null));
    });
  }, [addressId]);

  const subtotal = items?.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0) ?? 0;
  const shippingCost = shipping?.[0]?.cost ?? 0;

  async function handleSubmit() {
    if (!addressId) return;
    setStatus("loading");
    setMessage(null);
    try {
      const order = await api<Order>("/api/orders", {
        method: "POST",
        body: { address_id: addressId, payment_method: "manual_transfer" },
      });
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Gagal membuat pesanan");
    }
  }

  if (items && items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-foreground/60">Keranjang Anda kosong.</p>
        <Link href="/products" className="mt-3 inline-block text-sm text-brand-dark hover:underline">
          Mulai belanja →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Checkout</h1>

      <div className="mt-6 flex flex-col gap-6">
        <Section title="Alamat Pengiriman">
          {addresses && addresses.length === 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground/60">Anda belum memiliki alamat tersimpan.</p>
              <Link href="/addresses" className="text-sm font-medium text-brand-dark hover:underline">
                Tambah alamat →
              </Link>
            </div>
          )}
          {addresses && addresses.length > 0 && (
            <div className="flex flex-col gap-2">
              {addresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${
                    addressId === addr.id ? "border-brand bg-brand-light/40" : "border-border"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={addressId === addr.id}
                    onChange={() => setAddressId(addr.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{addr.label}</span> — {addr.recipient_name}
                    <br />
                    <span className="text-foreground/60">
                      {addr.address_line}, {addr.district}, {addr.city}
                    </span>
                  </span>
                </label>
              ))}
              <Link href="/addresses" className="mt-1 text-sm text-brand-dark hover:underline">
                + Tambah alamat baru
              </Link>
            </div>
          )}
        </Section>

        <Section title="Metode Pembayaran">
          <p className="text-sm text-foreground/70">Transfer Manual — unggah bukti bayar setelah pesanan dibuat.</p>
        </Section>

        <Section title="Ringkasan Pesanan">
          <div className="flex justify-between text-sm">
            <span className="text-foreground/60">Subtotal</span>
            <span>{formatIDR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-foreground/60">Ongkos Kirim</span>
            <span>{shipping ? formatIDR(shippingCost) : "-"}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold">
            <span>Total</span>
            <span>{formatIDR(subtotal + shippingCost)}</span>
          </div>
        </Section>

        {status === "error" && message && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{message}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === "loading" || !addressId}
          className={primaryButtonClass}
        >
          {status === "loading" ? "Memproses…" : "Buat Pesanan"}
        </button>
      </div>
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
