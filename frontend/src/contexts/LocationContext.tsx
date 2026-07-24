"use client";

import { createContext, useContext } from "react";

import { useGeolocation, type GeoStatus } from "@/hooks/useGeolocation";

interface LocationContextValue {
  status: GeoStatus;
  lat: number | null;
  lng: number | null;
}

const LocationContext = createContext<LocationContextValue | null>(null);

// Requests device geolocation once per app load (mounted at the root), so
// every page — landing, product list, detail — resolves against the same
// coordinates instead of re-prompting per page.
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const geo = useGeolocation();
  return <LocationContext.Provider value={geo}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
