"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  AuthCard,
  FormField,
  inputClass,
  primaryButtonClass,
} from "@/components/auth/AuthCard";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal masuk");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Masuk" subtitle="Selamat datang kembali di GrocerGo">
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
        <FormField label="Password">
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </FormField>

        <div className="text-right text-sm">
          <Link
            href="/reset-password"
            className="text-brand-dark hover:underline"
          >
            Lupa password?
          </Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? "Memproses…" : "Masuk"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-foreground/60">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="font-medium text-brand-dark hover:underline"
        >
          Daftar
        </Link>
      </p>
    </AuthCard>
  );
}
