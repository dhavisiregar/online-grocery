"use client";

import { useState, type FormEvent } from "react";

import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import type { Role, User } from "@/types";

export interface UserFormValues {
  name: string;
  email: string;
  phone?: string;
  role: Role;
  password: string;
}

const ROLE_LABEL: Record<Role, string> = {
  user: "Pengguna",
  store_admin: "Store Admin",
  super_admin: "Super Admin",
};

export function UserForm({
  initial,
  onSubmit,
  submitting,
  error,
}: {
  initial?: User;
  onSubmit: (values: UserFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [role, setRole] = useState<Role>(initial?.role ?? "user");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ name, email, phone: phone || undefined, role, password });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Nama">
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
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
      {initial && (
        <FormField label="Nomor Telepon (opsional)">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </FormField>
      )}
      <FormField label="Peran">
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
          {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label={initial ? "Password Baru (opsional)" : "Password"} hint={initial ? undefined : "Minimal 8 karakter"}>
        <PasswordInput
          required={!initial}
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className={primaryButtonClass}>
        {submitting ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}
