"use client";

import { useState, type FormEvent } from "react";

import { api, ApiError } from "@/lib/api";
import { AuthCard, FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await api("/api/auth/resend-verification", { method: "POST", auth: false, body: { email } });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Gagal mengirim ulang email");
    }
  }

  if (status === "done") {
    return (
      <AuthCard title="Email terkirim" subtitle="Cek kotak masuk Anda">
        <p className="text-sm text-foreground/70">
          Jika akun Anda terdaftar dan belum terverifikasi, tautan verifikasi baru telah dikirim.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Kirim Ulang Verifikasi" subtitle="Masukkan email akun Anda">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </FormField>
        {status === "error" && message && <p className="text-sm text-red-600">{message}</p>}
        <button type="submit" disabled={status === "loading"} className={primaryButtonClass}>
          {status === "loading" ? "Mengirim…" : "Kirim Ulang"}
        </button>
      </form>
    </AuthCard>
  );
}
