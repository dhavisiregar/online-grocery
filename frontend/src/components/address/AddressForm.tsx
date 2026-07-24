"use client";

import { useState, type FormEvent } from "react";

import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";
import { DestinationSearch } from "@/components/shared/DestinationSearch";
import { api } from "@/lib/api";
import type { Destination, UserAddress } from "@/types";

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
  rajaongkir_destination_id: undefined,
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
  const [geocoding, setGeocoding] = useState(false);

  function set<K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleDestinationSelect(d: Destination) {
    setValues((v) => ({
      ...v,
      province: d.province_name,
      city: d.city_name,
      district: d.district_name,
      postal_code: d.zip_code,
      rajaongkir_destination_id: d.id,
    }));

    setGeocoding(true);
    try {
      const geo = await api<{ latitude: number; longitude: number }>("/api/geocode", { query: { q: d.label } });
      set("latitude", geo.latitude);
      set("longitude", geo.longitude);
    } catch {
      // Geocoding is best-effort — the "use current location" button below
      // still lets the shopper set coordinates manually if this fails.
    } finally {
      setGeocoding(false);
    }
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
      </div>

      <FormField label="Kecamatan / Kota">
        <DestinationSearch onSelect={handleDestinationSelect} />
      </FormField>

      {values.province && (
        <p className="rounded-md bg-surface p-3 text-sm text-foreground/70">
          {values.district}, {values.city}, {values.province} {values.postal_code}
        </p>
      )}

      <FormField label="Alamat Lengkap (jalan, nomor rumah, patokan)">
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
          {geocoding
            ? "Mencari titik lokasi…"
            : `Titik lokasi: ${values.latitude ? values.latitude.toFixed(5) : "-"}, ${
                values.longitude ? values.longitude.toFixed(5) : "-"
              }`}
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
          Pilih kecamatan/kota di atas (titik lokasi terisi otomatis), atau klik &quot;Gunakan Lokasi Saat
          Ini&quot;.
        </p>
      )}
    </form>
  );
}
