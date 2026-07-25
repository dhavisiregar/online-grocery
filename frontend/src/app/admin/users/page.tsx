"use client";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { PaginationControls, StatusNotice } from "@/components/admin/StatusNotice";
import type { User } from "@/types";

export default function AdminUsersPage() {
  const { items, pagination, error, loading, page, setPage, search, setSearch } =
    usePaginatedApi<User>("/api/admin/users");

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">Pengguna Terdaftar</h1>

      <input
        type="search"
        placeholder="Cari pengguna…"
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
                <th className="p-3">Email</th>
                <th className="p-3">Peran</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t border-border transition-colors hover:bg-surface/50">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-foreground/70">{u.email}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-foreground/70">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        u.is_verified ? "bg-brand-light text-brand-dark" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {u.is_verified ? "Terverifikasi" : "Belum"}
                    </span>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-foreground/50">
                    Tidak ada pengguna.
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
