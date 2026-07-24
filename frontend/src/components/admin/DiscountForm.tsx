"use client";

import { useEffect, useState, type FormEvent } from "react";

import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Discount, DiscountType, Product, Store, ValueType } from "@/types";

// Date-only inputs are stored/rounded to whole days: start at 00:00, end at
// 23:59 the same calendar day, so a discount created for "today" is active
// for all of today.
function toStartOfDayISO(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}
function toEndOfDayISO(date: string): string {
  return new Date(`${date}T23:59:59`).toISOString();
}
function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

export function DiscountForm({
  discount,
  onSaved,
}: {
  discount: Discount | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeId, setStoreId] = useState(discount?.store_id ?? 0);
  const [type, setType] = useState<DiscountType>(discount?.type ?? "manual");
  const [productId, setProductId] = useState(discount?.product_id ?? 0);
  const [valueType, setValueType] = useState<ValueType>(discount?.value_type ?? "percentage");
  const [value, setValue] = useState(discount?.value ?? 0);
  const [minPurchase, setMinPurchase] = useState(discount?.min_purchase ?? 0);
  const [maxDiscount, setMaxDiscount] = useState(discount?.max_discount ?? 0);
  const [startDate, setStartDate] = useState(
    discount ? toDateInput(discount.start_date) : new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(discount ? toDateInput(discount.end_date) : "");
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

  const needsProduct = type === "manual" || type === "buy_one_get_one";
  const needsValue = type !== "buy_one_get_one";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!endDate) {
      setMessage("Tanggal berakhir wajib diisi");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const body = {
        store_id: storeId || undefined,
        product_id: needsProduct ? productId : undefined,
        type,
        value_type: valueType,
        value: needsValue ? value : 0,
        min_purchase: type === "min_purchase" ? minPurchase : undefined,
        max_discount: type === "min_purchase" && maxDiscount > 0 ? maxDiscount : undefined,
        start_date: toStartOfDayISO(startDate),
        end_date: toEndOfDayISO(endDate),
      };
      if (discount) {
        await api(`/api/admin/discounts/${discount.id}`, { method: "PUT", body });
      } else {
        await api("/api/admin/discounts", { method: "POST", body });
      }
      onSaved();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Gagal menyimpan diskon");
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

      <FormField label="Jenis Diskon">
        <select value={type} onChange={(e) => setType(e.target.value as DiscountType)} className={inputClass}>
          <option value="manual">Diskon Produk (nominal/persen)</option>
          <option value="buy_one_get_one">Beli 1 Gratis 1</option>
          <option value="min_purchase">Minimum Belanja (berlaku satu toko)</option>
        </select>
      </FormField>

      {needsProduct && (
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

      {needsValue && (
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tipe Nilai">
            <select value={valueType} onChange={(e) => setValueType(e.target.value as ValueType)} className={inputClass}>
              <option value="percentage">Persen (%)</option>
              <option value="nominal">Nominal (Rp)</option>
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
      )}

      {type === "min_purchase" && (
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Minimum Belanja (Rp)">
            <input
              required
              type="number"
              min={1}
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
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Mulai">
          <input
            required
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Berakhir">
          <input
            required
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </FormField>
      </div>

      {message && <p className="text-sm text-red-600">{message}</p>}

      <button type="submit" disabled={status === "loading"} className={primaryButtonClass}>
        {status === "loading" ? "Menyimpan…" : "Simpan Diskon"}
      </button>
    </form>
  );
}
