"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { api, ApiError } from "@/lib/api";
import { AuthCard, FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}

function VerifyForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setStatus("error");
      setMessage("Konfirmasi password tidak cocok");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      await api("/api/auth/verify", { method: "POST", auth: false, body: { token, password } });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Verifikasi gagal");
    }
  }

  if (!token) {
    return (
      <AuthCard title="Tautan tidak valid" subtitle="Token verifikasi tidak ditemukan">
        <p className="text-sm text-foreground/70">
          Pastikan Anda membuka tautan verifikasi terbaru dari email Anda.
        </p>
        <Link href="/resend-verification" className="mt-4 inline-block text-sm text-brand-dark hover:underline">
          Kirim ulang email verifikasi
        </Link>
      </AuthCard>
    );
  }

  if (status === "done") {
    return (
      <AuthCard title="Akun terverifikasi" subtitle="Password Anda telah dibuat">
        <Link href="/login" className="text-sm text-brand-dark hover:underline">
          Lanjut ke halaman masuk →
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Verifikasi Akun" subtitle="Buat password untuk menyelesaikan pendaftaran">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Password">
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Konfirmasi Password">
          <input
            required
            minLength={8}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </FormField>

        {status === "error" && message && <p className="text-sm text-red-600">{message}</p>}

        <button type="submit" disabled={status === "loading"} className={primaryButtonClass}>
          {status === "loading" ? "Memproses…" : "Verifikasi & Buat Password"}
        </button>
      </form>
    </AuthCard>
  );
}
