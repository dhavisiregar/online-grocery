"use client";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { PaginationControls, StatusNotice } from "@/components/admin/StatusNotice";
import type { User } from "@/types";

export default function AdminStoreAdminsPage() {
  const { items, pagination, error, loading, page, setPage } = usePaginatedApi<User>("/api/admin/store-admins");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Store Admin</h1>
        <button
          type="button"
          disabled
          title="Form penempatan store admin ke toko belum diimplementasikan"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white opacity-50"
        >
          + Tempatkan Admin
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
                <th className="p-3">Email</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-6 text-center text-foreground/50">
                    Belum ada store admin.
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
