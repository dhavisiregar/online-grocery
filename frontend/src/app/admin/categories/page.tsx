"use client";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { PaginationControls, StatusNotice } from "@/components/admin/StatusNotice";
import type { Category } from "@/types";

export default function AdminCategoriesPage() {
  const { items, pagination, error, loading, page, setPage } = usePaginatedApi<Category>("/api/admin/categories");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Kategori</h1>
        <button
          type="button"
          disabled
          title="Form tambah kategori (dengan validasi nama unik) belum diimplementasikan"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white opacity-50"
        >
          + Tambah Kategori
        </button>
      </div>

      {error && <div className="mt-4"><StatusNotice message={error} /></div>}
      {loading && <p className="mt-4 text-sm text-foreground/60">Memuat…</p>}

      {!loading && !error && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-foreground/60">
              <tr>
                <th className="p-3">Nama</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3 text-foreground/40">Edit · Hapus</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-6 text-center text-foreground/50">
                    Belum ada kategori.
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
