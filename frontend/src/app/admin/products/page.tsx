"use client";

import { useState } from "react";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { PaginationControls, StatusNotice } from "@/components/admin/StatusNotice";
import { Modal } from "@/components/admin/Modal";
import { ProductForm } from "@/components/admin/ProductForm";
import { api, ApiError } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import type { Product } from "@/types";

export default function AdminProductsPage() {
  const { items, pagination, error, loading, page, setPage, search, setSearch, reload } =
    usePaginatedApi<Product>("/api/admin/products");
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  async function handleDelete(product: Product) {
    if (!window.confirm(`Hapus produk "${product.name}"?`)) return;
    try {
      await api(`/api/admin/products/${product.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal menghapus produk");
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight">Produk</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0"
        >
          + Tambah Produk
        </button>
      </div>

      <input
        type="search"
        placeholder="Cari produk…"
        defaultValue={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full max-w-sm rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-shadow placeholder:text-foreground/40 focus:border-brand focus:ring-2 focus:ring-brand/25"
      />

      {error && <div className="mt-4"><StatusNotice message={error} /></div>}
      {loading && <p className="mt-4 text-sm text-foreground/60">Memuat…</p>}

      {!loading && !error && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-surface/80 text-left text-xs font-semibold uppercase tracking-wide text-foreground/60">
              <tr>
                <th className="p-3">Nama</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Harga</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-border transition-colors hover:bg-surface/50">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.category?.name ?? "-"}</td>
                  <td className="p-3">{formatIDR(p.price)}</td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setEditing(p)} className="text-brand-dark hover:underline">
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(p)} className="text-red-600 hover:underline">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-foreground/50">
                    Belum ada produk.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pagination && <PaginationControls page={page} pagination={pagination} onPage={setPage} />}

      {editing !== null && (
        <Modal title={editing === "new" ? "Tambah Produk" : "Edit Produk"} onClose={() => setEditing(null)}>
          <ProductForm
            initial={editing === "new" ? undefined : editing}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
