"use client";

import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { StatusNotice } from "@/components/admin/StatusNotice";
import type { Store } from "@/types";

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Store[]>("/api/stores", { auth: false })
      .then(setStores)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Gagal memuat toko"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Toko</h1>
        <button
          type="button"
          disabled
          title="Form tambah toko (dengan titik lokasi) belum diimplementasikan"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white opacity-50"
        >
          + Tambah Toko
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <StatusNotice message={error} />
        </div>
      )}
      {loading && <p className="mt-4 text-sm text-foreground/60">Memuat…</p>}

      {!loading && !error && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-foreground/60">
              <tr>
                <th className="p-3">Nama</th>
                <th className="p-3">Kota</th>
                <th className="p-3">Radius Layanan</th>
                <th className="p-3">Toko Utama</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.city}</td>
                  <td className="p-3">{s.max_distance_km} km</td>
                  <td className="p-3">{s.is_main ? "Ya" : "-"}</td>
                </tr>
              ))}
              {stores.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-foreground/50">
                    Belum ada toko terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
