"use client";

import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { StatusNotice } from "@/components/admin/StatusNotice";

const REPORTS = [
  { key: "sales/monthly", label: "Penjualan Bulanan" },
  { key: "sales/by-category", label: "Penjualan per Kategori" },
  { key: "sales/by-product", label: "Penjualan per Produk" },
  { key: "stock/summary", label: "Ringkasan Stok Bulanan" },
  { key: "stock/detail", label: "Detail Stok per Produk" },
] as const;

export default function AdminReportsPage() {
  const [active, setActive] = useState<(typeof REPORTS)[number]["key"]>(REPORTS[0].key);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      api(`/api/admin/reports/${active}`)
        .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat laporan"))
        .finally(() => setLoading(false));
    });
  }, [active]);

  return (
    <div>
      <h1 className="text-xl font-bold">Laporan</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            onClick={() => setActive(r.key)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              active === r.key
                ? "border-brand bg-brand-light text-brand-dark"
                : "border-border text-foreground/60"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading && <p className="text-sm text-foreground/60">Memuat…</p>}
        {!loading && error && <StatusNotice message={error} />}
      </div>
    </div>
  );
}
