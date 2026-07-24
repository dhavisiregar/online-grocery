"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import type { User } from "@/types";

interface Props {
  productId: number;
  storeId: number;
  stock: number;
  price: number;
  effectivePrice?: number;
  user: User | null;
  onAdded: () => void;
}

export function AddToCartPanel({ productId, storeId, stock, price, effectivePrice, user, onAdded }: Props) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (!user) {
    return (
      <Notice text="Masuk untuk menambahkan produk ini ke keranjang.">
        <Link href="/login" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white">
          Masuk
        </Link>
      </Notice>
    );
  }

  if (!user.is_verified) {
    return <Notice text="Verifikasi email Anda terlebih dahulu untuk bisa berbelanja." />;
  }

  if (stock <= 0) {
    return <Notice text="Stok produk ini sedang habis di toko terdekat Anda." />;
  }

  const hasDiscount = effectivePrice !== undefined && effectivePrice < price;
  const unitPrice = hasDiscount ? effectivePrice : price;
  const subtotal = unitPrice * qty;

  async function handleAdd() {
    setStatus("loading");
    setMessage(null);
    try {
      await api("/api/cart/items", {
        method: "POST",
        body: { product_id: productId, store_id: storeId, quantity: qty },
      });
      setStatus("done");
      onAdded();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Gagal menambahkan ke keranjang");
    }
  }

  function handleBuyNow() {
    router.push(`/checkout?product_id=${productId}&store_id=${storeId}&quantity=${qty}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <QuantityStepper qty={qty} max={stock} onChange={setQty} />
        <span className="text-sm text-foreground/60">
          Stok: <span className="font-semibold text-foreground">{stock}</span>
        </span>
      </div>

      <div>
        {hasDiscount && (
          <p className="text-sm text-foreground/40 line-through">{formatIDR(price * qty)}</p>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-foreground/60">Subtotal</span>
          <span className="text-lg font-bold">{formatIDR(subtotal)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={status === "loading"}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {status === "loading" ? "Menambahkan…" : "+ Keranjang"}
      </button>
      <button
        type="button"
        onClick={handleBuyNow}
        className="rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand-dark hover:bg-brand-light"
      >
        Beli Langsung
      </button>

      {status === "done" && <p className="text-sm text-brand-dark">Ditambahkan ke keranjang.</p>}
      {status === "error" && message && <p className="text-sm text-red-600">{message}</p>}
    </div>
  );
}

function QuantityStepper({ qty, max, onChange }: { qty: number; max: number; onChange: (n: number) => void }) {
  function clamp(n: number) {
    if (!Number.isFinite(n)) return 1;
    return Math.min(max, Math.max(1, Math.trunc(n)));
  }

  return (
    <div className="inline-flex w-fit items-center self-start rounded-md border border-border">
      <button
        type="button"
        onClick={() => onChange(clamp(qty - 1))}
        className="px-3 py-2 text-sm"
        aria-label="Kurangi jumlah"
      >
        −
      </button>
      <input
        type="number"
        min={1}
        max={max}
        value={qty}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-12 border-x border-border bg-transparent py-2 text-center text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Jumlah"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(qty + 1))}
        className="px-3 py-2 text-sm"
        aria-label="Tambah jumlah"
      >
        +
      </button>
    </div>
  );
}

function Notice({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <p className="text-sm text-foreground/70">{text}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
