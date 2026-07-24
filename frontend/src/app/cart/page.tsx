"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api, ApiError } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { formatIDR } from "@/lib/format";
import type { CartItem } from "@/types";

export default function CartPage() {
  return (
    <RequireAuth>
      <CartContent />
    </RequireAuth>
  );
}

function CartContent() {
  const { refresh: refreshCount } = useCart();
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api<CartItem[]>("/api/cart")
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat keranjang"))
      .finally(() => setLoading(false));
  }

  async function updateQty(itemId: number, quantity: number) {
    await api(`/api/cart/items/${itemId}`, { method: "PUT", body: { quantity } }).catch(() => null);
    load();
    refreshCount();
  }

  async function remove(itemId: number) {
    await api(`/api/cart/items/${itemId}`, { method: "DELETE" }).catch(() => null);
    load();
    refreshCount();
  }

  const subtotal = items?.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0) ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Keranjang Belanja</h1>

      {loading && <p className="mt-6 text-sm text-foreground/60">Memuat…</p>}

      {!loading && error && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      )}

      {!loading && !error && items && items.length === 0 && (
        <div className="mt-10 text-center">
          <p className="text-foreground/60">Keranjang Anda masih kosong.</p>
          <Link href="/products" className="mt-3 inline-block text-sm text-brand-dark hover:underline">
            Mulai belanja →
          </Link>
        </div>
      )}

      {!loading && !error && items && items.length > 0 && (
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          <div className="flex flex-col gap-4 md:col-span-2">
            {items.map((item) => (
              <CartRow key={item.id} item={item} onQty={updateQty} onRemove={remove} />
            ))}
          </div>

          <aside className="h-fit rounded-xl border border-border p-6">
            <h2 className="font-semibold">Ringkasan</h2>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-foreground/60">Subtotal</span>
              <span className="font-medium">{formatIDR(subtotal)}</span>
            </div>
            <Link
              href="/checkout"
              className="mt-4 block rounded-md bg-brand px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-dark"
            >
              Checkout
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

function CartRow({
  item,
  onQty,
  onRemove,
}: {
  item: CartItem;
  onQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-surface text-2xl">🛒</div>
      <div className="flex-1">
        <p className="text-sm font-medium">{item.product?.name ?? `Produk #${item.product_id}`}</p>
        {item.product && <p className="text-sm text-foreground/60">{formatIDR(item.product.price)}</p>}
      </div>
      <input
        type="number"
        min={1}
        value={item.quantity}
        onChange={(e) => onQty(item.id, Number(e.target.value))}
        className="w-16 rounded-md border border-border px-2 py-1 text-sm"
      />
      <button type="button" onClick={() => onRemove(item.id)} className="text-sm text-red-600">
        Hapus
      </button>
    </div>
  );
}
