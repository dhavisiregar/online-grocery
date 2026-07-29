"use client";

import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { confirmDelete, notifyError } from "@/lib/alerts";
import { Modal } from "@/components/admin/Modal";
import { StatusNotice } from "@/components/admin/StatusNotice";
import { StoreForm, type StoreFormValues } from "@/components/admin/StoreForm";
import { inputClass } from "@/components/auth/AuthCard";
import { AssignButton, DeleteButton, EditButton } from "@/components/ui/RowActions";
import type { Store } from "@/types";

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Store | "new" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [assigning, setAssigning] = useState<Store | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api<Store[]>("/api/stores", { auth: false })
      .then(setStores)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat toko"))
      .finally(() => setLoading(false));
  }

  async function handleSubmit(values: StoreFormValues) {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing && editing !== "new") {
        await api(`/api/admin/stores/${editing.id}`, { method: "PUT", body: values });
      } else {
        await api("/api/admin/stores", { method: "POST", body: values });
      }
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gagal menyimpan toko");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(store: Store) {
    if (!(await confirmDelete(`Hapus toko "${store.name}"?`))) return;
    try {
      await api(`/api/admin/stores/${store.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      notifyError(err instanceof ApiError ? err.message : "Gagal menghapus toko");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Toko</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0"
        >
          + Tambah Toko
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
                <th className="p-3">Kota</th>
                <th className="p-3">Radius Layanan</th>
                <th className="p-3">Utama</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id} className="border-t border-border transition-colors hover:bg-surface/50">
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.city}</td>
                  <td className="p-3">{s.max_distance_km} km</td>
                  <td className="p-3">{s.is_main ? "Ya" : "-"}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <EditButton onClick={() => setEditing(s)} />
                      <AssignButton onClick={() => setAssigning(s)} label="Tempatkan Admin" />
                      <DeleteButton onClick={() => handleDelete(s)} />
                    </div>
                  </td>
                </tr>
              ))}
              {stores.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-foreground/50">
                    Belum ada toko terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <Modal title={editing === "new" ? "Tambah Toko" : "Edit Toko"} onClose={() => setEditing(null)}>
          <StoreForm
            initial={editing === "new" ? undefined : editing}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={formError}
          />
        </Modal>
      )}

      {assigning && (
        <AssignAdminModal store={assigning} onClose={() => setAssigning(null)} onAssigned={load} />
      )}
    </div>
  );
}

function AssignAdminModal({
  store,
  onClose,
  onAssigned,
}: {
  store: Store;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api(`/api/admin/stores/${store.id}/assign-admin`, {
        method: "POST",
        body: { user_id: Number(userId) },
      });
      onAssigned();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menempatkan admin");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Tempatkan Admin — ${store.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-foreground/60">
          Masukkan ID pengguna store admin (lihat di halaman Store Admin) yang akan ditempatkan di toko ini.
        </p>
        <input
          required
          type="number"
          placeholder="ID Pengguna"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className={inputClass}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0 disabled:opacity-60"
        >
          {submitting ? "Menyimpan…" : "Tempatkan"}
        </button>
      </form>
    </Modal>
  );
}
