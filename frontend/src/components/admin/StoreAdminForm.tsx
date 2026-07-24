"use client";

import { useState, type FormEvent } from "react";

import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";
import type { User } from "@/types";

export interface StoreAdminFormValues {
  name: string;
  email: string;
  password: string;
}

export function StoreAdminForm({
  initial,
  onSubmit,
  submitting,
  error,
}: {
  initial?: User;
  onSubmit: (values: StoreAdminFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ name, email, password });
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
      <FormField label={initial ? "Password Baru (opsional)" : "Password"}>
        <input
          required={!initial}
          minLength={8}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </FormField>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className={primaryButtonClass}>
        {submitting ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}
