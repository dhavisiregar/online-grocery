"use client";

import { useState } from "react";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { PaginationControls, StatusNotice } from "@/components/admin/StatusNotice";
import { Modal } from "@/components/admin/Modal";
import { StoreAdminForm, type StoreAdminFormValues } from "@/components/admin/StoreAdminForm";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/types";

export default function AdminStoreAdminsPage() {
  const { items, pagination, error, loading, page, setPage, reload } = usePaginatedApi<User>(
    "/api/admin/store-admins",
  );
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: StoreAdminFormValues) {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing && editing !== "new") {
        const body: Partial<StoreAdminFormValues> = { name: values.name, email: values.email };
        if (values.password) body.password = values.password;
        await api(`/api/admin/store-admins/${editing.id}`, { method: "PUT", body });
      } else {
        await api("/api/admin/store-admins", { method: "POST", body: values });
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gagal menyimpan store admin");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: User) {
    if (!window.confirm(`Hapus store admin "${user.name}"?`)) return;
    try {
      await api(`/api/admin/store-admins/${user.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal menghapus store admin");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Store Admin</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0"
        >
          + Tambah Store Admin
        </button>
      </div>
      <p className="mt-1 text-sm text-foreground/60">
        Setelah dibuat, tempatkan store admin ke sebuah toko dari halaman Toko (gunakan ID pengguna di bawah).
      </p>

      {error && <div className="mt-4"><StatusNotice message={error} /></div>}
      {loading && <p className="mt-4 text-sm text-foreground/60">Memuat…</p>}

      {!loading && !error && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-surface/80 text-left text-xs font-semibold uppercase tracking-wide text-foreground/60">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Nama</th>
                <th className="p-3">Email</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t border-border transition-colors hover:bg-surface/50">
                  <td className="p-3 text-foreground/60">{u.id}</td>
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setEditing(u)} className="text-brand-dark hover:underline">
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(u)} className="text-red-600 hover:underline">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-foreground/50">
                    Belum ada store admin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pagination && <PaginationControls page={page} pagination={pagination} onPage={setPage} />}

      {editing !== null && (
        <Modal title={editing === "new" ? "Tambah Store Admin" : "Edit Store Admin"} onClose={() => setEditing(null)}>
          <StoreAdminForm
            initial={editing === "new" ? undefined : editing}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={formError}
          />
        </Modal>
      )}
    </div>
  );
}
