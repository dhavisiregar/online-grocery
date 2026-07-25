"use client";

import { useState, type FormEvent } from "react";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { PaginationControls, StatusNotice } from "@/components/admin/StatusNotice";
import { Modal } from "@/components/admin/Modal";
import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/types";

export default function AdminCategoriesPage() {
  const { items, pagination, error, loading, page, setPage, reload } = usePaginatedApi<Category>(
    "/api/admin/categories",
  );
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setName("");
    setFormError(null);
    setEditing("new");
  }

  function openEdit(category: Category) {
    setName(category.name);
    setFormError(null);
    setEditing(category);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing && editing !== "new") {
        await api(`/api/admin/categories/${editing.id}`, { method: "PUT", body: { name } });
      } else {
        await api("/api/admin/categories", { method: "POST", body: { name } });
      }
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gagal menyimpan kategori");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(`Hapus kategori "${category.name}"?`)) return;
    try {
      await api(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal menghapus kategori");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Kategori</h1>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0"
        >
          + Tambah Kategori
        </button>
      </div>

      {error && <div className="mt-4"><StatusNotice message={error} /></div>}
      {loading && <p className="mt-4 text-sm text-foreground/60">Memuat…</p>}

      {!loading && !error && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-surface/80 text-left text-xs font-semibold uppercase tracking-wide text-foreground/60">
              <tr>
                <th className="p-3">Nama</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-border transition-colors hover:bg-surface/50">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <button type="button" onClick={() => openEdit(c)} className="text-brand-dark hover:underline">
                        Edit
                      </button>
                      <button type="button" onClick={() => handleDelete(c)} className="text-red-600 hover:underline">
                        Hapus
                      </button>
                    </div>
                  </td>
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

      {editing !== null && (
        <Modal title={editing === "new" ? "Tambah Kategori" : "Edit Kategori"} onClose={() => setEditing(null)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField label="Nama Kategori">
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </FormField>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button type="submit" disabled={submitting} className={primaryButtonClass}>
              {submitting ? "Menyimpan…" : "Simpan"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
