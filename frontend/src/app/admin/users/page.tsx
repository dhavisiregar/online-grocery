"use client";

import { useState } from "react";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { PaginationControls, StatusNotice } from "@/components/admin/StatusNotice";
import { Modal } from "@/components/admin/Modal";
import { UserForm, type UserFormValues } from "@/components/admin/UserForm";
import { EditButton, DeleteButton } from "@/components/ui/RowActions";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { confirmDelete, notifyError } from "@/lib/alerts";
import type { User } from "@/types";

const ROLE_LABEL: Record<User["role"], string> = {
  user: "Pengguna",
  store_admin: "Store Admin",
  super_admin: "Super Admin",
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { items, pagination, error, loading, page, setPage, search, setSearch, reload } =
    usePaginatedApi<User>("/api/admin/users");
  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: UserFormValues) {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing && editing !== "new") {
        const body: Partial<UserFormValues> = {
          name: values.name,
          email: values.email,
          phone: values.phone,
          role: values.role,
        };
        if (values.password) body.password = values.password;
        await api(`/api/admin/users/${editing.id}`, { method: "PUT", body });
      } else {
        await api("/api/admin/users", { method: "POST", body: values });
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gagal menyimpan pengguna");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: User) {
    if (!(await confirmDelete(`Hapus pengguna "${user.name}"?`))) return;
    try {
      await api(`/api/admin/users/${user.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      notifyError(err instanceof ApiError ? err.message : "Gagal menghapus pengguna");
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight">Pengguna Terdaftar</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0"
        >
          + Tambah Pengguna
        </button>
      </div>

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
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t border-border transition-colors hover:bg-surface/50">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-foreground/70">{u.email}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-foreground/70">
                      {ROLE_LABEL[u.role]}
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
                  <td className="p-3">
                    <div className="flex gap-1">
                      <EditButton onClick={() => setEditing(u)} />
                      {currentUser?.id !== u.id && <DeleteButton onClick={() => handleDelete(u)} />}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-foreground/50">
                    Tidak ada pengguna.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pagination && <PaginationControls page={page} pagination={pagination} onPage={setPage} />}

      {editing !== null && (
        <Modal title={editing === "new" ? "Tambah Pengguna" : "Edit Pengguna"} onClose={() => setEditing(null)}>
          <UserForm
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
