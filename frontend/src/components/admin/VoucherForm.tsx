"use client";

import { useEffect, useState, type FormEvent } from "react";

import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";
import { api, ApiError } from "@/lib/api";
import type { Product, ValueType, VoucherType } from "@/types";

export function VoucherForm({ onSaved }: { onSaved: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [code, setCode] = useState("");
  const [type, setType] = useState<VoucherType>("total");
  const [valueType, setValueType] = useState<ValueType>("nominal");
  const [value, setValue] = useState(0);
  const [minPurchase, setMinPurchase] = useState(0);
  const [maxDiscount, setMaxDiscount] = useState(0);
  const [productId, setProductId] = useState(0);
  const [expiresAt, setExpiresAt] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: Product[] }>("/api/admin/products", { query: { limit: 100 } })
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!expiresAt) {
      setMessage("Tanggal kedaluwarsa wajib diisi");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      await api("/api/admin/discounts/vouchers", {
        method: "POST",
        body: {
          code,
          type,
          value_type: valueType,
          value,
          min_purchase: minPurchase > 0 ? minPurchase : undefined,
          max_discount: maxDiscount > 0 ? maxDiscount : undefined,
          product_id: type === "product" ? productId : undefined,
          expires_at: new Date(`${expiresAt}T23:59:59`).toISOString(),
        },
      });
      onSaved();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Gagal membuat voucher");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Kode Voucher">
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="mis. HEMAT10K"
          className={inputClass}
        />
      </FormField>

      <FormField label="Jenis Voucher">
        <select value={type} onChange={(e) => setType(e.target.value as VoucherType)} className={inputClass}>
          <option value="total">Total Belanja</option>
          <option value="shipping">Ongkos Kirim</option>
          <option value="product">Produk Tertentu</option>
        </select>
      </FormField>

      {type === "product" && (
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
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Tipe Nilai">
          <select value={valueType} onChange={(e) => setValueType(e.target.value as ValueType)} className={inputClass}>
            <option value="nominal">Nominal (Rp)</option>
            <option value="percentage">Persen (%)</option>
          </select>
        </FormField>
        <FormField label="Nilai">
          <input
            required
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className={inputClass}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Minimum Belanja (Rp, opsional)">
          <input
            type="number"
            min={0}
            value={minPurchase}
            onChange={(e) => setMinPurchase(Number(e.target.value))}
            className={inputClass}
          />
        </FormField>
        <FormField label="Maks. Potongan (Rp, opsional)">
          <input
            type="number"
            min={0}
            value={maxDiscount}
            onChange={(e) => setMaxDiscount(Number(e.target.value))}
            className={inputClass}
          />
        </FormField>
      </div>

      <FormField label="Kedaluwarsa">
        <input
          required
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className={inputClass}
        />
      </FormField>

      {message && <p className="text-sm text-red-600">{message}</p>}

      <button type="submit" disabled={status === "loading"} className={primaryButtonClass}>
        {status === "loading" ? "Menyimpan…" : "Buat Voucher"}
      </button>
    </form>
  );
}
