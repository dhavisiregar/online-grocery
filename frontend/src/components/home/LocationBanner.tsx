"use client";

import { useLocation } from "@/contexts/LocationContext";

export function LocationBanner() {
  const { status } = useLocation();

  if (status === "granted") {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-dark">
        📍 Menampilkan produk dari toko terdekat lokasi Anda
      </p>
    );
  }
  if (status === "denied" || status === "unsupported") {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm text-foreground/60">
        Akses lokasi tidak tersedia — menampilkan produk dari toko utama
      </p>
    );
  }
  return (
    <p className="inline-flex items-center gap-1.5 text-sm text-foreground/60">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
      Meminta izin lokasi perangkat…
    </p>
  );
}
