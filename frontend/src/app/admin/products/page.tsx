"use client";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { PaginationControls, StatusNotice } from "@/components/admin/StatusNotice";
import { formatIDR } from "@/lib/format";
import type { Product } from "@/types";

export default function AdminProductsPage() {
  const { items, pagination, error, loading, page, setPage, search, setSearch } =
    usePaginatedApi<Product>("/api/admin/products");

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Produk</h1>
        <button
          type="button"
          disabled
          title="Form tambah produk (dengan validasi nama unik & upload gambar) belum diimplementasikan"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white opacity-50"
        >
          + Tambah Produk
        </button>
      </div>

      <input
        type="search"
        placeholder="Cari produk…"
        defaultValue={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm"
      />

      {error && <div className="mt-4"><StatusNotice message={error} /></div>}
      {loading && <p className="mt-4 text-sm text-foreground/60">Memuat…</p>}

      {!loading && !error && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-foreground/60">
              <tr>
                <th className="p-3">Nama</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Harga</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.category?.name ?? "-"}</td>
                  <td className="p-3">{formatIDR(p.price)}</td>
                  <td className="p-3 text-foreground/40">Edit · Hapus</td>
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
    </div>
  );
}
