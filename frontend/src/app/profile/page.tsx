"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { api, ApiError, resolveUploadUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";
import { formatIDR } from "@/lib/format";
import { VOUCHER_SOURCE_LABEL, VOUCHER_TYPE_LABEL, type UserVoucher } from "@/types";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}

function ProfileContent() {
  const { user, refresh } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Profil Saya</h1>

      {!user.is_verified && <VerifyNotice email={user.email} />}

      <div className="mt-6 rounded-2xl border border-border bg-background p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light text-2xl shadow-soft">
            {user.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveUploadUrl(user.profile_photo_url)}
                alt={user.name}
                className="h-16 w-16 object-cover"
              />
            ) : (
              "🙂"
            )}
          </div>
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-foreground/60">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-foreground/60">Kode Referral</dt>
            <dd className="mt-0.5 font-mono font-semibold">{user.referral_code}</dd>
          </div>
          <div>
            <dt className="text-foreground/60">Status</dt>
            <dd className="mt-0.5 font-medium">{user.is_verified ? "Terverifikasi" : "Belum verifikasi"}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/addresses"
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
        >
          Kelola Alamat
        </Link>
        <Link
          href="/orders"
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
        >
          Pesanan Saya
        </Link>
      </div>

      <ProfileForm onUpdated={refresh} initialName={user.name} initialPhone={user.phone ?? ""} />

      <VoucherWallet />
    </div>
  );
}

function VoucherWallet() {
  const [vouchers, setVouchers] = useState<UserVoucher[] | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function loadVouchers() {
    api<{ items: UserVoucher[] }>("/api/vouchers/mine")
      .then((res) => setVouchers(res.items))
      .catch(() => setVouchers([]));
  }

  useEffect(() => {
    loadVouchers();
  }, []);

  async function handleClaim(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await api("/api/vouchers/claim", { method: "POST", body: { code } });
      setCode("");
      setMessage("Voucher berhasil diklaim.");
      setStatus("idle");
      loadVouchers();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Gagal mengklaim voucher");
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-background p-6 shadow-soft">
      <h2 className="font-semibold">Voucher Saya</h2>

      <form onSubmit={handleClaim} className="mt-3 flex gap-2">
        <input
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Masukkan kode promo"
          className={`${inputClass} flex-1`}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
        >
          {status === "loading" ? "Mengklaim…" : "Klaim"}
        </button>
      </form>
      {message && (
        <p className={`mt-2 text-sm ${status === "error" ? "text-red-600" : "text-brand-dark"}`}>{message}</p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {vouchers === null && <p className="text-sm text-foreground/60">Memuat…</p>}
        {vouchers?.length === 0 && <p className="text-sm text-foreground/60">Belum ada voucher tersimpan.</p>}
        {vouchers?.map((uv) => (
          <div
            key={uv.id}
            className="flex items-center justify-between rounded-xl border border-dashed border-border p-3.5 text-sm transition-colors hover:bg-surface"
          >
            <div>
              <p className="font-mono font-semibold text-brand-dark">{uv.voucher.code}</p>
              <p className="text-foreground/60">
                {VOUCHER_TYPE_LABEL[uv.voucher.type]} —{" "}
                {uv.voucher.value_type === "percentage" ? `${uv.voucher.value}%` : formatIDR(uv.voucher.value)}
                {" · "}dari {VOUCHER_SOURCE_LABEL[uv.obtained_from]}
              </p>
            </div>
            <span className="whitespace-nowrap text-xs text-foreground/50">
              s.d. {new Date(uv.voucher.expires_at).toLocaleDateString("id-ID")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerifyNotice({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  async function resend() {
    await api("/api/auth/resend-verification", { method: "POST", auth: false, body: { email } }).catch(() => null);
    setSent(true);
  }
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p>Email Anda belum terverifikasi. Beberapa fitur seperti belanja dinonaktifkan.</p>
      <button type="button" onClick={resend} className="mt-2 font-medium underline underline-offset-2">
        {sent ? "Email verifikasi terkirim" : "Kirim ulang email verifikasi"}
      </button>
    </div>
  );
}

function ProfileForm({
  initialName,
  initialPhone,
  onUpdated,
}: {
  initialName: string;
  initialPhone: string;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      await api("/api/users/me", { method: "PUT", body: { name, phone } });
      await onUpdated();
      setStatus("idle");
      setMessage("Profil diperbarui.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Gagal memperbarui profil");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-background shadow-soft p-6">
      <h2 className="font-semibold">Perbarui Data Diri</h2>
      <FormField label="Nama Lengkap">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </FormField>
      <FormField label="Nomor Telepon">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
      </FormField>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-600" : "text-brand-dark"}`}>{message}</p>
      )}
      <button type="submit" disabled={status === "loading"} className={`${primaryButtonClass} sm:w-fit`}>
        {status === "loading" ? "Menyimpan…" : "Simpan Perubahan"}
      </button>
    </form>
  );
}
