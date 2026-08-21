"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { LoyaltySummary } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface LoyaltyContextValue {
  summary: LoyaltySummary | null;
  refresh: () => Promise<void>;
}

const LoyaltyContext = createContext<LoyaltyContextValue | null>(null);

// Single source of truth for points/tier — shared by the navbar widget, the
// /account/loyalty page, and checkout's "redeem points" action, so a
// redemption anywhere immediately updates the balance everywhere else.
export function LoyaltyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setSummary(null);
      return;
    }
    try {
      const res = await api<LoyaltySummary>("/api/loyalty/me");
      setSummary(res);
    } catch {
      setSummary(null);
    }
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => {
      refresh();
    });
  }, [refresh]);

  return <LoyaltyContext.Provider value={{ summary, refresh }}>{children}</LoyaltyContext.Provider>;
}

export function useLoyalty() {
  const ctx = useContext(LoyaltyContext);
  if (!ctx) throw new Error("useLoyalty must be used within LoyaltyProvider");
  return ctx;
}
