"use client";

import { useLocation } from "@/contexts/LocationContext";

export function LocationBanner() {
  const { status } = useLocation();

  if (status === "granted") {
    return (
      <p className="text-sm text-brand-dark">📍 Menampilkan produk dari toko terdekat lokasi Anda.</p>
    );
  }
  if (status === "denied" || status === "unsupported") {
    return (
      <p className="text-sm text-foreground/60">
        Akses lokasi tidak tersedia — menampilkan produk dari toko utama.
      </p>
    );
  }
  return <p className="text-sm text-foreground/60">Meminta izin lokasi perangkat…</p>;
}
