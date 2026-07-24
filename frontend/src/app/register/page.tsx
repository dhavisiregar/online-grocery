"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

import { api, ApiError } from "@/lib/api";
import {
  AuthCard,
  FormField,
  inputClass,
  primaryButtonClass,
} from "@/components/auth/AuthCard";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await api("/api/auth/register", {
        method: "POST",
        auth: false,
        body: { name, email, referral_code: referralCode || undefined },
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Registrasi gagal");
    }
  }

  if (status === "done") {
    return (
      <AuthCard title="Cek email Anda" subtitle="Registrasi berhasil">
        <p className="text-sm text-foreground/70">
          Kami telah mengirimkan tautan verifikasi ke <strong>{email}</strong>.
          Tautan berlaku selama 1 jam dan digunakan sekaligus untuk membuat
          password akun Anda.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm text-brand-dark hover:underline"
        >
          Kembali ke halaman masuk
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Buat Akun"
      subtitle="Daftar untuk mulai berbelanja di GrocerGo"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Nama Lengkap">
          <input
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Kode Referral (opsional)">
          <input
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            className={inputClass}
          />
        </FormField>

        {status === "error" && message && (
          <p className="text-sm text-red-600">{message}</p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className={primaryButtonClass}
        >
          {status === "loading" ? "Memproses…" : "Daftar"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-foreground/60">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-dark hover:underline"
        >
          Masuk
        </Link>
      </p>
    </AuthCard>
  );
}
