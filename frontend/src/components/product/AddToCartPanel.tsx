"use client";

import { useState } from "react";
import Link from "next/link";

import { api, ApiError } from "@/lib/api";
import type { User } from "@/types";

interface Props {
  productId: number;
  storeId: number;
  stock: number;
  user: User | null;
  onAdded: () => void;
}

export function AddToCartPanel({ productId, storeId, stock, user, onAdded }: Props) {
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <QuantityStepper qty={qty} max={stock} onChange={setQty} />
        <button
          type="button"
          onClick={handleAdd}
          disabled={status === "loading"}
          className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {status === "loading" ? "Menambahkan…" : "Tambah ke Keranjang"}
        </button>
      </div>
      {status === "done" && <p className="text-sm text-brand-dark">Ditambahkan ke keranjang.</p>}
      {status === "error" && message && <p className="text-sm text-red-600">{message}</p>}
    </div>
  );
}

function QuantityStepper({ qty, max, onChange }: { qty: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center rounded-md border border-border">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, qty - 1))}
        className="px-3 py-2 text-sm"
        aria-label="Kurangi jumlah"
      >
        −
      </button>
      <span className="w-8 text-center text-sm">{qty}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, qty + 1))}
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
