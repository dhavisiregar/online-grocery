"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api, ApiError, resolveUploadUrl } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
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
      <h1 className="text-2xl font-bold tracking-tight">Keranjang Belanja</h1>

      {loading && <CartSkeleton />}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>
      )}

      {!loading && !error && items && items.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <span aria-hidden className="text-4xl">
            🛒
          </span>
          <p className="text-foreground/60">Keranjang Anda masih kosong.</p>
          <Link
            href="/products"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-dark hover:underline"
          >
            Mulai belanja <span aria-hidden>→</span>
          </Link>
        </div>
      )}

      {!loading && !error && items && items.length > 0 && (
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          <div className="flex flex-col gap-3 md:col-span-2">
            {items.map((item) => (
              <CartRow key={item.id} item={item} onQty={updateQty} onRemove={remove} />
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-border bg-background p-6 shadow-soft md:sticky md:top-20">
            <h2 className="font-semibold">Ringkasan</h2>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-foreground/60">Subtotal ({items.length} produk)</span>
              <span className="font-semibold">{formatIDR(subtotal)}</span>
            </div>
            <Link
              href="/checkout"
              className="mt-5 flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0"
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
  const image = resolveUploadUrl(item.product?.images?.[0]?.image_url);

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4 shadow-soft">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface text-2xl">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={item.product?.name ?? ""} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>🛒</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.product?.name ?? `Produk #${item.product_id}`}</p>
        {item.product && <p className="text-sm text-foreground/60">{formatIDR(item.product.price)}</p>}
      </div>
      <QuantityStepper qty={item.quantity} max={99} onChange={(n) => onQty(item.id, n)} />
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label="Hapus dari keranjang"
        className="rounded-lg p-2 text-foreground/40 transition-colors hover:bg-red-50 hover:text-red-600"
      >
        🗑️
      </button>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="mt-6 grid gap-8 md:grid-cols-3">
      <div className="flex flex-col gap-3 md:col-span-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-2xl border border-border bg-surface" />
    </div>
  );
}
