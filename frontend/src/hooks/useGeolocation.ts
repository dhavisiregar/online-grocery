"use client";

import { useEffect, useState } from "react";

export type GeoStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";

interface GeoState {
  status: GeoStatus;
  lat: number | null;
  lng: number | null;
}

// Requests device geolocation on mount, per spec: the landing page must ask
// for location permission on first load so it can show the nearest store.
// Denial or lack of support falls back to the main store (handled by callers
// passing lat/lng=null to the API, which resolves to the main store).
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle", lat: null, lng: null });

  useEffect(() => {
    // Deferred a microtask so the initial status update happens from an
    // async callback rather than synchronously during the effect itself.
    queueMicrotask(() => {
      if (!("geolocation" in navigator)) {
        setState({ status: "unsupported", lat: null, lng: null });
        return;
      }

      setState((s) => ({ ...s, status: "loading" }));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setState({ status: "granted", lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setState({ status: "denied", lat: null, lng: null });
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
      );
    });
  }, []);

  return state;
}
