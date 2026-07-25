"use client";

import { useState } from "react";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { PaginationControls, StatusNotice } from "@/components/admin/StatusNotice";
import { Modal } from "@/components/admin/Modal";
import { AdjustStockForm } from "@/components/admin/AdjustStockForm";

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

const TYPE_LABEL: Record<string, string> = { in: "Masuk", out: "Keluar" };
const REF_LABEL: Record<string, string> = {
  manual: "Manual",
  order: "Pesanan",
  mutation: "Mutasi",
  cancel: "Pembatalan",
};

export default function AdminInventoryPage() {
  const { items, pagination, error, loading, page, setPage, reload } =
    usePaginatedApi<StockJournalRow>("/api/admin/inventory");
  const [adjusting, setAdjusting] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Stok</h1>
        <button
          type="button"
          onClick={() => setAdjusting(true)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0"
        >
          + Sesuaikan Stok
        </button>
      </div>
      <p className="mt-1 text-sm text-foreground/60">
        Setiap perubahan stok dicatat sebagai jurnal (tambah/kurang) sebelum jumlah stok toko diperbarui.
      </p>

      {!loading && error && (
        <div className="mt-4">
          <StatusNotice message={error} />
        </div>
      )}
      {loading && <p className="mt-4 text-sm text-foreground/60">Memuat…</p>}

      {!loading && !error && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-surface/80 text-left text-xs font-semibold uppercase tracking-wide text-foreground/60">
              <tr>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Produk</th>
                <th className="p-3">Tipe</th>
                <th className="p-3">Jumlah</th>
                <th className="p-3">Referensi</th>
                <th className="p-3">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {items.map((j) => (
                <tr key={j.id} className="border-t border-border transition-colors hover:bg-surface/50">
                  <td className="p-3 text-foreground/60">{new Date(j.created_at).toLocaleString("id-ID")}</td>
                  <td className="p-3">{j.product?.name ?? `Produk #${j.product_id}`}</td>
                  <td className="p-3">
                    <span className={j.type === "in" ? "text-brand-dark" : "text-red-600"}>
                      {TYPE_LABEL[j.type]}
                    </span>
                  </td>
                  <td className="p-3">{j.quantity}</td>
                  <td className="p-3 text-foreground/60">{REF_LABEL[j.reference_type] ?? j.reference_type}</td>
                  <td className="p-3 text-foreground/60">{j.notes || "-"}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-foreground/50">
                    Belum ada riwayat perubahan stok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pagination && <PaginationControls page={page} pagination={pagination} onPage={setPage} />}

      {adjusting && (
        <Modal title="Sesuaikan Stok" onClose={() => setAdjusting(false)}>
          <AdjustStockForm
            onSaved={() => {
              setAdjusting(false);
              reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
