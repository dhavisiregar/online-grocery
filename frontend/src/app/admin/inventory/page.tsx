"use client";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { StatusNotice } from "@/components/admin/StatusNotice";

interface StockJournalRow {
  id: number;
  product_id: number;
  type: "in" | "out";
  quantity: number;
  reference_type: string;
  created_at: string;
}

export default function AdminInventoryPage() {
  const { error, loading } = usePaginatedApi<StockJournalRow>("/api/admin/inventory");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stok</h1>
        <button
          type="button"
          disabled
          title="Penyesuaian stok (dengan jurnal perubahan) belum diimplementasikan"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white opacity-50"
        >
          + Sesuaikan Stok
        </button>
      </div>
      <p className="mt-1 text-sm text-foreground/60">
        Setiap perubahan stok dicatat sebagai jurnal (tambah/kurang) sebelum jumlah stok toko
        diperbarui.
      </p>

      {!loading && error && (
        <div className="mt-4">
          <StatusNotice message={error} />
        </div>
      )}
      {loading && <p className="mt-4 text-sm text-foreground/60">Memuat…</p>}
    </div>
  );
}
