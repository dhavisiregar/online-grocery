"use client";

import { useState, type FormEvent } from "react";

import { api, ApiError } from "@/lib/api";
import { AuthCard, FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await api("/api/auth/reset-password", { method: "POST", auth: false, body: { email } });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Permintaan gagal");
    }
  }

  if (status === "done") {
    return (
      <AuthCard title="Cek email Anda" subtitle="Tautan reset password telah dikirim">
        <p className="text-sm text-foreground/70">
          Jika email terdaftar dengan metode email/password, tautan reset akan tiba dalam
          beberapa menit dan berlaku selama 1 jam.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Lupa Password" subtitle="Masukkan email akun Anda">
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
          {status === "loading" ? "Mengirim…" : "Kirim Tautan Reset"}
        </button>
      </form>
    </AuthCard>
  );
}
