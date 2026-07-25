"use client";

import { useState, type FormEvent } from "react";

import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";
import { DestinationSearch } from "@/components/shared/DestinationSearch";
import { api } from "@/lib/api";
import type { Destination, Store } from "@/types";

export type StoreFormValues = Omit<Store, "id">;

const EMPTY: StoreFormValues = {
  name: "",
  address: "",
  city: "",
  province: "",
  latitude: 0,
  longitude: 0,
  is_main: false,
  max_distance_km: 25,
  rajaongkir_destination_id: undefined,
};

export function StoreForm({
  initial,
  onSubmit,
  submitting,
  error,
}: {
  initial?: Store;
  onSubmit: (values: StoreFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [values, setValues] = useState<StoreFormValues>(initial ?? EMPTY);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  function set<K extends keyof StoreFormValues>(key: K, value: StoreFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleDestinationSelect(d: Destination) {
    setValues((v) => ({
      ...v,
      province: d.province_name,
      city: d.city_name,
      rajaongkir_destination_id: d.id,
    }));

    setGeocoding(true);
    try {
      const geo = await api<{ latitude: number; longitude: number }>("/api/geocode", { query: { q: d.label } });
      set("latitude", geo.latitude);
      set("longitude", geo.longitude);
    } catch {
      // Best-effort — "use current location" below still works as a manual override.
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label="Nama Toko">
        <input required value={values.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
      </FormField>

      <FormField label="Kecamatan / Kota">
        <DestinationSearch onSelect={handleDestinationSelect} />
      </FormField>
      {values.province && (
        <p className="rounded-lg bg-surface p-3 text-sm text-foreground/70">
          📍 {values.city}, {values.province}
        </p>
      )}

      <FormField label="Alamat">
        <textarea
          required
          rows={2}
          value={values.address}
          onChange={(e) => set("address", e.target.value)}
          className={inputClass}
        />
      </FormField>

      <FormField label="Radius Layanan (km)">
        <input
          required
          type="number"
          min={1}
          value={values.max_distance_km}
          onChange={(e) => set("max_distance_km", Number(e.target.value))}
          className={inputClass}
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.is_main} onChange={(e) => set("is_main", e.target.checked)} />
        Jadikan toko utama (fallback saat lokasi pengguna tidak tersedia)
      </label>

      <div className="flex flex-col gap-2 rounded-lg bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
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
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-60"
        >
          {locating ? "Mengambil lokasi…" : "📍 Gunakan Lokasi Saat Ini"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting || !values.latitude} className={primaryButtonClass}>
        {submitting ? "Menyimpan…" : "Simpan Toko"}
      </button>
    </form>
  );
}
