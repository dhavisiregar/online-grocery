"use client";

import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { confirmDelete } from "@/lib/alerts";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AddressCard } from "@/components/address/AddressCard";
import { AddressForm, type AddressFormValues } from "@/components/address/AddressForm";
import type { UserAddress } from "@/types";

export default function AddressesPage() {
  return (
    <RequireAuth>
      <AddressesContent />
    </RequireAuth>
  );
}

function AddressesContent() {
  const [addresses, setAddresses] = useState<UserAddress[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserAddress | "new" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  function load() {
    api<UserAddress[]>("/api/addresses")
      .then(setAddresses)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat alamat"));
  }

  async function handleSubmit(values: AddressFormValues) {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing && editing !== "new") {
        await api(`/api/addresses/${editing.id}`, { method: "PUT", body: values });
      } else {
        await api("/api/addresses", { method: "POST", body: values });
      }
      setEditing(null);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gagal menyimpan alamat");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(address: UserAddress) {
    if (!(await confirmDelete(`Hapus alamat "${address.label}"?`))) return;
    await api(`/api/addresses/${address.id}`, { method: "DELETE" }).catch(() => null);
    load();
  }

  async function handleSetPrimary(address: UserAddress) {
    await api(`/api/addresses/${address.id}/primary`, { method: "POST" }).catch(() => null);
    load();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Alamat Saya</h1>
        {editing === null && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0"
          >
            + Tambah Alamat
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="mt-6">
          <AddressForm
            initial={editing === "new" ? undefined : editing}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
            submitting={submitting}
            error={formError}
          />
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>
      )}

      {!error && addresses && addresses.length === 0 && editing === null && (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <span aria-hidden className="text-4xl">
            📍
          </span>
          <p className="text-sm text-foreground/60">Anda belum memiliki alamat tersimpan.</p>
        </div>
      )}

      {addresses && addresses.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              onEdit={() => setEditing(addr)}
              onDelete={() => handleDelete(addr)}
              onSetPrimary={() => handleSetPrimary(addr)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
