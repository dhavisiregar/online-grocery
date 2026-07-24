"use client";

import { useState, type ChangeEvent } from "react";

import { getToken } from "@/lib/api";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_SIZE_BYTES = 1 * 1024 * 1024;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function PaymentProofUpload({ orderId, onUploaded }: { orderId: string; onUploaded: () => void }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatus("error");
      setMessage("Format file harus .jpg, .jpeg, atau .png");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setStatus("error");
      setMessage("Ukuran file maksimum 1MB");
      return;
    }

    setStatus("loading");
    setMessage(null);
    try {
      const form = new FormData();
      form.append("proof", file);
      const res = await fetch(`${API_URL}/api/orders/${orderId}/payment-proof`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Gagal mengunggah bukti bayar");
      onUploaded();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Gagal mengunggah bukti bayar");
    }
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <label className="text-sm font-medium">Unggah Bukti Pembayaran</label>
      <input
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleChange}
        className="mt-2 block w-full text-sm"
      />
      <p className="mt-1 text-xs text-foreground/50">Format .jpg/.jpeg/.png, maksimum 1MB.</p>
      {status === "loading" && <p className="mt-2 text-sm text-foreground/60">Mengunggah…</p>}
      {status === "error" && message && <p className="mt-2 text-sm text-red-600">{message}</p>}
    </div>
  );
}
