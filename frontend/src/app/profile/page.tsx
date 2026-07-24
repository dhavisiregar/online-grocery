"use client";

import { useState, type FormEvent } from "react";

import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";

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
      <h1 className="text-2xl font-bold">Profil Saya</h1>

      {!user.is_verified && <VerifyNotice email={user.email} />}

      <div className="mt-6 rounded-xl border border-border p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-light text-2xl">
            {user.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.profile_photo_url} alt={user.name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              "🙂"
            )}
          </div>
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-foreground/60">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-foreground/60">Kode Referral</dt>
            <dd className="font-medium">{user.referral_code}</dd>
          </div>
          <div>
            <dt className="text-foreground/60">Status</dt>
            <dd className="font-medium">{user.is_verified ? "Terverifikasi" : "Belum verifikasi"}</dd>
          </div>
        </dl>
      </div>

      <ProfileForm onUpdated={refresh} initialName={user.name} initialPhone={user.phone ?? ""} />
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
    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p>Email Anda belum terverifikasi. Beberapa fitur seperti belanja dinonaktifkan.</p>
      <button type="button" onClick={resend} className="mt-2 font-medium underline">
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
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 rounded-xl border border-border p-6">
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
