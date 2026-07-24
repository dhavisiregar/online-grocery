"use client";

import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import type { Pagination } from "@/types";

interface ListResponse<T> {
  items: T[];
  pagination: Pagination;
}

// Shared data-fetching for admin list pages: server-side pagination + search,
// matching the "no client-side filtering" requirement from the spec.
export function usePaginatedApi<T>(path: string, extraQuery: Record<string, string | number | undefined> = {}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const extraKey = JSON.stringify(extraQuery);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      api<ListResponse<T>>(path, { query: { page, search: search || undefined, ...extraQuery } })
        .then((res) => {
          setItems(res.items);
          setPagination(res.pagination);
        })
        .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat data"))
        .finally(() => setLoading(false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, page, search, extraKey]);

  return { items, pagination, error, loading, page, setPage, search, setSearch };
}
