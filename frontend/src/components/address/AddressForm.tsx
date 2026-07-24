"use client";

import { useState, type FormEvent } from "react";

import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";
import type { UserAddress } from "@/types";

export type AddressFormValues = Omit<UserAddress, "id" | "is_primary">;

const EMPTY: AddressFormValues = {
  label: "",
  recipient_name: "",
  phone: "",
  province: "",
  city: "",
  district: "",
  postal_code: "",
  address_line: "",
  latitude: 0,
  longitude: 0,
};

export function AddressForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  error,
}: {
  initial?: UserAddress;
  onSubmit: (values: AddressFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const [values, setValues] = useState<AddressFormValues>(initial ?? EMPTY);
  const [locating, setLocating] = useState(false);

  function set<K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", pos.coords.latitude);
        set("longitude", pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-border p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Label (mis. Rumah, Kantor)">
          <input required value={values.label} onChange={(e) => set("label", e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Nama Penerima">
          <input
            required
            value={values.recipient_name}
            onChange={(e) => set("recipient_name", e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Nomor Telepon">
          <input required value={values.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Kode Pos">
          <input
            required
            value={values.postal_code}
            onChange={(e) => set("postal_code", e.target.value)}
            className={inputClass}
          />
        </FormField>
        <FormField label="Provinsi">
          <input required value={values.province} onChange={(e) => set("province", e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Kota/Kabupaten">
          <input required value={values.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Kecamatan">
          <input required value={values.district} onChange={(e) => set("district", e.target.value)} className={inputClass} />
        </FormField>
      </div>

      <FormField label="Alamat Lengkap">
        <textarea
          required
          rows={3}
          value={values.address_line}
          onChange={(e) => set("address_line", e.target.value)}
          className={inputClass}
        />
      </FormField>

      <div className="flex flex-col gap-2 rounded-md bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground/60">
          Titik lokasi: {values.latitude ? values.latitude.toFixed(5) : "-"},{" "}
          {values.longitude ? values.longitude.toFixed(5) : "-"}
        </p>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-background"
        >
          {locating ? "Mengambil lokasi…" : "📍 Gunakan Lokasi Saat Ini"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={submitting || !values.latitude} className={primaryButtonClass}>
          {submitting ? "Menyimpan…" : "Simpan Alamat"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm">
          Batal
        </button>
      </div>
      {!values.latitude && (
        <p className="text-xs text-foreground/50">
          Klik &quot;Gunakan Lokasi Saat Ini&quot; untuk mengisi titik koordinat — dibutuhkan untuk menghitung ongkos kirim.
        </p>
      )}
    </form>
  );
}
