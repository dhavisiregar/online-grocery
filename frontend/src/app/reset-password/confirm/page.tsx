"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { api, ApiError } from "@/lib/api";
import { AuthCard, FormField, primaryButtonClass } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";

export default function ConfirmResetPasswordPage() {
  return (
    <Suspense>
      <ConfirmResetPasswordForm />
    </Suspense>
  );
}

function ConfirmResetPasswordForm() {
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
      await api("/api/auth/reset-password/confirm", {
        method: "POST",
        auth: false,
        body: { token, password },
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Reset password gagal");
    }
  }

  if (!token) {
    return (
      <AuthCard title="Tautan tidak valid" subtitle="Token reset password tidak ditemukan">
        <Link href="/reset-password" className="text-sm text-brand-dark hover:underline">
          Minta tautan baru
        </Link>
      </AuthCard>
    );
  }

  if (status === "done") {
    return (
      <AuthCard title="Password berhasil diubah">
        <Link href="/login" className="text-sm text-brand-dark hover:underline">
          Lanjut ke halaman masuk →
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Buat Password Baru">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Password Baru">
          <PasswordInput
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>
        <FormField label="Konfirmasi Password">
          <PasswordInput
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </FormField>
        {status === "error" && message && <p className="text-sm text-red-600">{message}</p>}
        <button type="submit" disabled={status === "loading"} className={primaryButtonClass}>
          {status === "loading" ? "Memproses…" : "Ubah Password"}
        </button>
      </form>
    </AuthCard>
  );
}
