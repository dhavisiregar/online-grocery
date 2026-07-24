"use client";

import { useEffect, useState, type FormEvent } from "react";

import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Product, Store } from "@/types";

export function AdjustStockForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeId, setStoreId] = useState(0);
  const [productId, setProductId] = useState(0);
  const [type, setType] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: Product[] }>("/api/admin/products", { query: { limit: 100 } })
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]));
    if (isSuperAdmin) {
      api<Store[]>("/api/stores", { auth: false })
        .then(setStores)
        .catch(() => setStores([]));
    }
  }, [isSuperAdmin]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await api("/api/admin/inventory/adjust", {
        method: "POST",
        body: { store_id: storeId || undefined, product_id: productId, type, quantity, notes },
      });
      onSaved();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Gagal menyesuaikan stok");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {isSuperAdmin && (
        <FormField label="Toko">
          <select
            required
            value={storeId || ""}
            onChange={(e) => setStoreId(Number(e.target.value))}
            className={inputClass}
          >
            <option value="" disabled>
              Pilih toko
            </option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField label="Produk">
        <select
          required
          value={productId || ""}
          onChange={(e) => setProductId(Number(e.target.value))}
          className={inputClass}
        >
          <option value="" disabled>
            Pilih produk
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Tipe">
          <select value={type} onChange={(e) => setType(e.target.value as "in" | "out")} className={inputClass}>
            <option value="in">Tambah (Masuk)</option>
            <option value="out">Kurang (Keluar)</option>
          </select>
        </FormField>
        <FormField label="Jumlah">
          <input
            required
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className={inputClass}
          />
        </FormField>
      </div>

      <FormField label="Catatan">
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
      </FormField>

      {message && <p className="text-sm text-red-600">{message}</p>}

      <button type="submit" disabled={status === "loading"} className={primaryButtonClass}>
        {status === "loading" ? "Menyimpan…" : "Simpan Penyesuaian"}
      </button>
    </form>
  );
}
