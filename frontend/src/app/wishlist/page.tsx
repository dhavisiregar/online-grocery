"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { api, ApiError, resolveUploadUrl } from "@/lib/api";
import { useLocation } from "@/contexts/LocationContext";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { notifyError } from "@/lib/alerts";
import { formatIDR } from "@/lib/format";
import type { Pagination, WishlistItem } from "@/types";

export default function WishlistPage() {
  return (
    <RequireAuth redirectToLogin>
      <WishlistContent />
    </RequireAuth>
  );
}

function WishlistContent() {
  const geo = useLocation();
  const { refresh: refreshWishlist } = useWishlist();
  const { refresh: refreshCart } = useCart();

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<WishlistItem[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (geo.status === "idle" || geo.status === "loading") return;

    // Deferred so the loading/error reset runs from an async callback
    // rather than synchronously during the effect itself.
    queueMicrotask(() => {
      load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.lat, geo.lng, page]);

  function load() {
    setLoading(true);
    setError(null);
    api<{ items: WishlistItem[]; pagination: Pagination }>("/api/wishlist", {
      query: { lat: geo.lat ?? undefined, lng: geo.lng ?? undefined, page, limit: 12 },
    })
      .then((res) => {
        setItems(res.items);
        setPagination(res.pagination);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat wishlist"))
      .finally(() => setLoading(false));
  }

  async function remove(productId: number) {
    await api(`/api/wishlist/${productId}`, { method: "DELETE" }).catch(() => null);
    load();
    refreshWishlist();
  }

  async function addToCart(item: WishlistItem) {
    try {
      await api("/api/cart/items", {
        method: "POST",
        body: { product_id: item.product_id, store_id: item.store_id, quantity: 1 },
      });
      refreshCart();
    } catch (err) {
      notifyError(err instanceof ApiError ? err.message : "Gagal menambahkan ke keranjang");
    }
  }

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Wishlist</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Produk yang Anda simpan, dengan status stok di toko terdekat Anda.
      </p>

      {(loading || geo.status === "idle" || geo.status === "loading") && <WishlistSkeleton />}

      {!loading && error && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>
      )}

      {!loading && !error && items && items.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <span aria-hidden className="text-4xl">
            🤍
          </span>
          <p className="text-foreground/60">Wishlist Anda masih kosong.</p>
          <Link
            href="/products"
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-dark hover:underline"
          >
            Jelajahi produk <span aria-hidden>→</span>
          </Link>
        </div>
      )}

      {!loading && !error && items && items.length > 0 && (
        <>
          <div className="mt-6 flex flex-col gap-3">
            {items.map((item) => (
              <WishlistRow key={item.id} item={item} onRemove={remove} onAddToCart={addToCart} />
            ))}
          </div>

          {pagination && pagination.total > pagination.limit && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span className="text-foreground/60">
                Halaman <span className="font-semibold text-foreground">{page}</span> dari {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WishlistRow({
  item,
  onRemove,
  onAddToCart,
}: {
  item: WishlistItem;
  onRemove: (productId: number) => void;
  onAddToCart: (item: WishlistItem) => void;
}) {
  const product = item.product;
  const image = resolveUploadUrl(product?.images?.[0]?.image_url);
  const outOfStock = item.stock <= 0;
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    setAdding(true);
    await onAddToCart(item);
    setAdding(false);
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4 shadow-soft">
      <Link
        href={`/products/${item.product_id}`}
        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface text-2xl"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product?.name ?? ""} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>🛒</span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/products/${item.product_id}`} className="truncate text-sm font-medium hover:underline">
          {product?.name ?? `Produk #${item.product_id}`}
        </Link>
        {product && <p className="text-sm text-foreground/60">{formatIDR(product.price)}</p>}
        {outOfStock ? (
          <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Stok habis
          </span>
        ) : (
          <span className="mt-1 inline-block rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-dark">
            Stok {item.stock}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock || adding}
        className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:opacity-40"
      >
        {adding ? "Menambahkan…" : "+ Keranjang"}
      </button>
      <button
        type="button"
        onClick={() => onRemove(item.product_id)}
        aria-label="Hapus dari wishlist"
        className="rounded-lg p-2 text-foreground/40 transition-colors hover:bg-red-50 hover:text-red-600"
      >
        🗑️
      </button>
    </div>
  );
}

function WishlistSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
      ))}
    </div>
  );
}
