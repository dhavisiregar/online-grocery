"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { formatIDR } from "@/lib/format";
import type { ProductWithStock } from "@/types";
import { AddToCartPanel } from "@/components/product/AddToCartPanel";

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
      api<ProductWithStock>(`/api/products/${params.id}`, { auth: false })
        .then(setItem)
        .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat produk"))
        .finally(() => setLoading(false));
    });
  }, [params.id]);

  if (loading) return <DetailSkeleton />;
  if (error || !item) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-foreground/70">{error ?? "Produk tidak ditemukan."}</p>
        <Link href="/products" className="mt-4 inline-block text-sm text-brand-dark hover:underline">
          ← Kembali ke daftar produk
        </Link>
      </div>
    );
  }

  const { product, stock } = item;
  const image = product.images?.[0]?.image_url;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded-xl bg-surface text-6xl">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={product.name} className="h-full w-full rounded-xl object-cover" />
          ) : (
            <span aria-hidden>🛒</span>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {product.category && (
            <span className="text-sm font-medium text-brand-dark">{product.category.name}</span>
          )}
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-2xl font-semibold">{formatIDR(product.price)}</p>
          <p className="whitespace-pre-line text-sm text-foreground/70">
            {product.description || "Tidak ada deskripsi untuk produk ini."}
          </p>

          <AddToCartPanel
            productId={product.id}
            storeId={item.store_id}
            stock={stock}
            user={user}
            onAdded={refreshCart}
          />
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-xl bg-surface" />
        <div className="flex flex-col gap-3">
          <div className="h-4 w-24 animate-pulse rounded bg-surface" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-surface" />
          <div className="h-6 w-32 animate-pulse rounded bg-surface" />
        </div>
      </div>
    </div>
  );
}
