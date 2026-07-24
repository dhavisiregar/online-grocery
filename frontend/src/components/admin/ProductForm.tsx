"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";
import { api, getToken } from "@/lib/api";
import type { Category, Product } from "@/types";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE_BYTES = 1 * 1024 * 1024;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function ProductForm({
  initial,
  onSaved,
}: {
  initial?: Product;
  onSaved: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? 0);
  const [price, setPrice] = useState(initial?.price ?? 0);
  const [weightGrams, setWeightGrams] = useState(initial?.weight_grams ?? 1000);
  const [images, setImages] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: Category[] }>("/api/categories", { query: { limit: 100 }, auth: false })
      .then((res) => setCategories(res.items))
      .catch(() => setCategories([]));
  }, []);

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setMessage(`Format ${file.name} tidak didukung (harus .jpg/.jpeg/.png/.gif/.webp)`);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setMessage(`${file.name} melebihi 1MB`);
        return;
      }
    }
    setMessage(null);
    setImages(files);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    const form = new FormData();
    form.append("name", name);
    form.append("description", description);
    form.append("category_id", String(categoryId));
    form.append("price", String(price));
    form.append("weight_grams", String(weightGrams));
    images.forEach((file) => form.append("images", file));

    try {
      const path = initial ? `/api/admin/products/${initial.id}` : "/api/admin/products";
      const res = await fetch(`${API_URL}${path}`, {
        method: initial ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Gagal menyimpan produk");
      onSaved();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Gagal menyimpan produk");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Nama Produk">
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </FormField>
      <FormField label="Deskripsi">
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Kategori">
          <select
            required
            value={categoryId || ""}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className={inputClass}
          >
            <option value="" disabled>
              Pilih kategori
            </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Berat (gram)">
          <input
            required
            type="number"
            min={1}
            value={weightGrams}
            onChange={(e) => setWeightGrams(Number(e.target.value))}
            className={inputClass}
          />
        </FormField>
      </div>
      <FormField label="Harga (Rp)">
        <input
          required
          type="number"
          min={1}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className={inputClass}
        />
      </FormField>
      <FormField label={initial ? "Tambah Foto Produk (opsional)" : "Foto Produk"}>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFiles}
        />
      </FormField>
      <p className="text-xs text-foreground/50">Format .jpg/.jpeg/.png/.gif/.webp, maksimum 1MB per foto.</p>

      {message && <p className={`text-sm ${status === "error" ? "text-red-600" : "text-foreground/60"}`}>{message}</p>}

      <button type="submit" disabled={status === "loading"} className={primaryButtonClass}>
        {status === "loading" ? "Menyimpan…" : "Simpan Produk"}
      </button>
    </form>
  );
}
