"use client";

import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { StatusNotice } from "@/components/admin/StatusNotice";
import { inputClass } from "@/components/auth/AuthCard";
import { useAuth } from "@/contexts/AuthContext";
import { formatIDR } from "@/lib/format";
import type { Product, Store } from "@/types";

const REPORTS = [
  { key: "sales/monthly", label: "Penjualan Bulanan" },
  { key: "sales/by-category", label: "Penjualan per Kategori" },
  { key: "sales/by-product", label: "Penjualan per Produk" },
  { key: "stock/summary", label: "Ringkasan Stok Bulanan" },
  { key: "stock/detail", label: "Detail Stok per Produk" },
] as const;

type ReportKey = (typeof REPORTS)[number]["key"];
const STOCK_REPORTS: ReportKey[] = ["stock/summary", "stock/detail"];

interface MonthlySalesRow {
  month: string;
  order_count: number;
  total: number;
}
interface CategorySalesRow {
  category_id: number;
  category_name: string;
  quantity: number;
  total: number;
}
interface ProductSalesRow {
  product_id: number;
  product_name: string;
  quantity: number;
  total: number;
}
interface StockSummaryRow {
  product_id: number;
  product_name: string;
  start_stock: number;
  stock_in: number;
  stock_out: number;
  end_stock: number;
}
interface StockJournalRow {
  id: number;
  product_id: number;
  product?: { name: string };
  type: "in" | "out";
  quantity: number;
  reference_type: string;
  notes: string;
  created_at: string;
}

const MONTH_LABEL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const REF_LABEL: Record<string, string> = {
  manual: "Manual", order: "Pesanan", mutation: "Mutasi", cancel: "Pembatalan",
};

export default function AdminReportsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [active, setActive] = useState<ReportKey>(REPORTS[0].key);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [wholeYear, setWholeYear] = useState(true);
  const [storeId, setStoreId] = useState(0);
  const [productFilter, setProductFilter] = useState(0);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [rows, setRows] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const requiresStore = STOCK_REPORTS.includes(active);

  useEffect(() => {
    if (isSuperAdmin) {
      api<Store[]>("/api/stores", { auth: false }).then(setStores).catch(() => setStores([]));
    }
    api<{ items: Product[] }>("/api/admin/products", { query: { limit: 100 } })
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]));
  }, [isSuperAdmin]);

  useEffect(() => {
    queueMicrotask(() => {
      if (requiresStore && isSuperAdmin && !storeId) {
        setRows([]);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const query: Record<string, string | number | undefined> = {
        year,
        month: requiresStore ? month : wholeYear ? undefined : month,
        store_id: storeId || undefined,
      };
      if (active === "stock/detail") query.product_id = productFilter || undefined;

      api<{ items: unknown[] }>(`/api/admin/reports/${active}`, { query })
        .then((res) => setRows(res.items))
        .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat laporan"))
        .finally(() => setLoading(false));
    });
  }, [active, year, month, wholeYear, storeId, productFilter, requiresStore, isSuperAdmin]);

  return (
    <div>
      <h1 className="text-xl font-bold">Laporan</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setActive(r.key)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              active === r.key ? "border-brand bg-brand-light text-brand-dark" : "border-border text-foreground/60"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <FilterField label="Tahun">
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className={`${inputClass} w-24`}
          />
        </FilterField>

        {!requiresStore && (
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={wholeYear} onChange={(e) => setWholeYear(e.target.checked)} />
            Seluruh tahun
          </label>
        )}

        {(requiresStore || !wholeYear) && (
          <FilterField label="Bulan">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={`${inputClass} w-36`}>
              {MONTH_LABEL.map((label, i) => (
                <option key={label} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
          </FilterField>
        )}

        {isSuperAdmin && (
          <FilterField label={requiresStore ? "Toko (wajib)" : "Toko"}>
            <select
              value={storeId || ""}
              onChange={(e) => setStoreId(Number(e.target.value))}
              className={`${inputClass} w-48`}
            >
              <option value="">{requiresStore ? "Pilih toko" : "Semua toko"}</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FilterField>
        )}

        {active === "stock/detail" && (
          <FilterField label="Produk">
            <select
              value={productFilter || ""}
              onChange={(e) => setProductFilter(Number(e.target.value))}
              className={`${inputClass} w-48`}
            >
              <option value="">Semua produk</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FilterField>
        )}
      </div>

      <div className="mt-4">
        {loading && <p className="text-sm text-foreground/60">Memuat…</p>}
        {!loading && error && <StatusNotice message={error} />}
        {!loading && !error && requiresStore && isSuperAdmin && !storeId && (
          <StatusNotice message="Pilih toko untuk melihat laporan stok." />
        )}
        {!loading && !error && (!requiresStore || !isSuperAdmin || storeId > 0) && (
          <ReportTable active={active} rows={rows} />
        )}
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-foreground/60">
      {label}
      {children}
    </label>
  );
}

function ReportTable({ active, rows }: { active: ReportKey; rows: unknown[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border p-6 text-center text-sm text-foreground/50">
        Tidak ada data untuk periode ini.
      </div>
    );
  }

  if (active === "sales/monthly") {
    const data = rows as MonthlySalesRow[];
    return (
      <Table headers={["Bulan", "Jumlah Pesanan", "Total Penjualan"]}>
        {data.map((r) => (
          <tr key={r.month} className="border-t border-border">
            <td className="p-3">{r.month}</td>
            <td className="p-3">{r.order_count}</td>
            <td className="p-3 font-medium">{formatIDR(r.total)}</td>
          </tr>
        ))}
      </Table>
    );
  }

  if (active === "sales/by-category") {
    const data = rows as CategorySalesRow[];
    return (
      <Table headers={["Kategori", "Qty Terjual", "Total Penjualan"]}>
        {data.map((r) => (
          <tr key={r.category_id} className="border-t border-border">
            <td className="p-3">{r.category_name}</td>
            <td className="p-3">{r.quantity}</td>
            <td className="p-3 font-medium">{formatIDR(r.total)}</td>
          </tr>
        ))}
      </Table>
    );
  }

  if (active === "sales/by-product") {
    const data = rows as ProductSalesRow[];
    return (
      <Table headers={["Produk", "Qty Terjual", "Total Penjualan"]}>
        {data.map((r) => (
          <tr key={r.product_id} className="border-t border-border">
            <td className="p-3">{r.product_name}</td>
            <td className="p-3">{r.quantity}</td>
            <td className="p-3 font-medium">{formatIDR(r.total)}</td>
          </tr>
        ))}
      </Table>
    );
  }

  if (active === "stock/summary") {
    const data = rows as StockSummaryRow[];
    return (
      <Table headers={["Produk", "Stok Awal", "Masuk", "Keluar", "Stok Akhir"]}>
        {data.map((r) => (
          <tr key={r.product_id} className="border-t border-border">
            <td className="p-3">{r.product_name}</td>
            <td className="p-3">{r.start_stock}</td>
            <td className="p-3 text-brand-dark">+{r.stock_in}</td>
            <td className="p-3 text-red-600">-{r.stock_out}</td>
            <td className="p-3 font-medium">{r.end_stock}</td>
          </tr>
        ))}
      </Table>
    );
  }

  const data = rows as StockJournalRow[];
  return (
    <Table headers={["Tanggal", "Produk", "Tipe", "Jumlah", "Referensi", "Catatan"]}>
      {data.map((j) => (
        <tr key={j.id} className="border-t border-border">
          <td className="p-3 text-foreground/60">{new Date(j.created_at).toLocaleString("id-ID")}</td>
          <td className="p-3">{j.product?.name ?? `Produk #${j.product_id}`}</td>
          <td className="p-3">
            <span className={j.type === "in" ? "text-brand-dark" : "text-red-600"}>
              {j.type === "in" ? "Masuk" : "Keluar"}
            </span>
          </td>
          <td className="p-3">{j.quantity}</td>
          <td className="p-3 text-foreground/60">{REF_LABEL[j.reference_type] ?? j.reference_type}</td>
          <td className="p-3 text-foreground/60">{j.notes || "-"}</td>
        </tr>
      ))}
    </Table>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-foreground/60">
          <tr>
            {headers.map((h) => (
              <th key={h} className="p-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
