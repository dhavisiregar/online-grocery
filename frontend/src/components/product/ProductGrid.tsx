"use client";

import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { useLocation } from "@/contexts/LocationContext";
import type { Category, Pagination, ProductWithStock } from "@/types";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductFilters } from "@/components/product/ProductFilters";

interface ProductsResponse {
  items: ProductWithStock[];
  pagination: Pagination;
  store_id: number;
}

export function ProductGrid({ limit = 12, showFilters = false }: { limit?: number; showFilters?: boolean }) {
  const geo = useLocation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!showFilters) return;
    api<{ items: Category[] }>("/api/categories", { query: { limit: 50 }, auth: false })
      .then((res) => setCategories(res.items))
      .catch(() => setCategories([]));
  }, [showFilters]);

  useEffect(() => {
    if (geo.status === "idle" || geo.status === "loading") return;

    // Deferred so the loading/error reset runs from an async callback
    // rather than synchronously during the effect itself.
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      api<ProductsResponse>("/api/products", {
        // No RequireAuth on this route — sending the token when present just
        // lets the backend fold in is_wishlisted for a logged-in shopper.
        query: {
          lat: geo.lat ?? undefined,
          lng: geo.lng ?? undefined,
          page,
          limit,
          search: search || undefined,
          category_id: categoryId,
        },
      })
        .then(setData)
        .catch((err) => {
          setError(err instanceof ApiError ? err.message : "Gagal memuat produk");
          setData(null);
        })
        .finally(() => setLoading(false));
    });
  }, [geo.status, geo.lat, geo.lng, page, search, categoryId, limit]);

  if (geo.status === "idle" || geo.status === "loading" || loading) {
    return <ProductGridSkeleton count={limit} />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
        <p className="font-medium">{error}</p>
        <p className="mt-1 text-sm">Coba gunakan lokasi lain atau muat ulang halaman.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {showFilters && (
        <ProductFilters
          search={search}
          onSearch={(v) => {
            setPage(1);
            setSearch(v);
          }}
          categories={categories}
          categoryId={categoryId}
          onCategory={(v) => {
            setPage(1);
            setCategoryId(v);
          }}
        />
      )}

      {data && data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span aria-hidden className="text-4xl">
            🔍
          </span>
          <p className="text-sm text-foreground/60">Tidak ada produk ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data?.items.map((item) => (
            <ProductCard key={item.product.id} item={item} />
          ))}
        </div>
      )}

      {showFilters && data && data.pagination.total > limit && (
        <Pager page={page} pagination={data.pagination} onPage={setPage} />
      )}
    </div>
  );
}

function Pager({
  page,
  pagination,
  onPage,
}: {
  page: number;
  pagination: Pagination;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  return (
    <div className="flex items-center justify-center gap-3 pt-2 text-sm">
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
      >
        Sebelumnya
      </button>
      <span className="text-foreground/60">
        Halaman <span className="font-semibold text-foreground">{page}</span> dari {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
      >
        Berikutnya
      </button>
    </div>
  );
}

function ProductGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-border">
          <div className="aspect-square animate-pulse bg-surface" />
          <div className="flex flex-col gap-2 p-3.5">
            <div className="h-3 w-16 animate-pulse rounded bg-surface" />
            <div className="h-4 w-full animate-pulse rounded bg-surface" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}
