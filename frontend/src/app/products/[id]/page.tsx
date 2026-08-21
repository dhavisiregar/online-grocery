"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { api, ApiError, resolveUploadUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { formatIDR } from "@/lib/format";
import type { ProductWithStock } from "@/types";
import { AddToCartPanel } from "@/components/product/AddToCartPanel";
import { WishlistButton } from "@/components/product/WishlistButton";
import { ProductReviews } from "@/components/product/ProductReviews";
import { StarRating } from "@/components/ui/StarRating";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { refresh: refreshCart } = useCart();

  const [item, setItem] = useState<ProductWithStock | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      // No RequireAuth on this route — sending the token when present just
      // lets the backend fold in is_wishlisted for a logged-in shopper.
      api<ProductWithStock>(`/api/products/${params.id}`)
        .then(setItem)
        .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat produk"))
        .finally(() => setLoading(false));
    });
  }, [params.id]);

  if (loading) return <DetailSkeleton />;
  if (error || !item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <span aria-hidden className="text-4xl">
          🥕
        </span>
        <p className="mt-3 text-foreground/70">{error ?? "Produk tidak ditemukan."}</p>
        <Link href="/products" className="mt-4 inline-block text-sm font-medium text-brand-dark hover:underline">
          ← Kembali ke daftar produk
        </Link>
      </div>
    );
  }

  const { product, stock, effective_price: effectivePrice } = item;
  const hasDiscount = effectivePrice !== undefined && effectivePrice < product.price;
  const image = resolveUploadUrl(product.images?.[0]?.image_url);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface text-6xl shadow-soft">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden>🛒</span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {product.category && (
            <span className="w-fit rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand-dark">
              {product.category.name}
            </span>
          )}
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{product.name}</h1>
            <WishlistButton productId={product.id} initialWishlisted={item.is_wishlisted} className="shrink-0" />
          </div>
          {item.review_count > 0 && (
            <div className="flex items-center gap-2">
              <StarRating value={Math.round(item.average_rating)} size="sm" />
              <span className="text-sm text-foreground/60">
                {item.average_rating.toFixed(1)} ({item.review_count} ulasan)
              </span>
            </div>
          )}
          <div>
            {hasDiscount && (
              <p className="text-sm text-foreground/40 line-through">{formatIDR(product.price)}</p>
            )}
            <p className="text-2xl font-bold sm:text-3xl">{formatIDR(hasDiscount ? effectivePrice : product.price)}</p>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/70">
            {product.description || "Tidak ada deskripsi untuk produk ini."}
          </p>

          <div className="mt-2 rounded-2xl border border-border bg-background p-5 shadow-soft">
            <AddToCartPanel
              productId={product.id}
              storeId={item.store_id}
              stock={stock}
              price={product.price}
              effectivePrice={effectivePrice}
              user={user}
              onAdded={refreshCart}
            />
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} canReview={item.can_review} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="aspect-square animate-pulse rounded-2xl bg-surface" />
        <div className="flex flex-col gap-3">
          <div className="h-5 w-24 animate-pulse rounded-full bg-surface" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-surface" />
          <div className="h-7 w-32 animate-pulse rounded bg-surface" />
          <div className="mt-2 h-32 animate-pulse rounded-2xl bg-surface" />
        </div>
      </div>
    </div>
  );
}
