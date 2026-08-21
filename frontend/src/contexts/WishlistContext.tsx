"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import type { WishlistItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface WishlistContextValue {
  count: number;
  loaded: boolean;
  isWishlisted: (productId: number, fallback?: boolean) => boolean;
  toggleWishlist: (productId: number, currentlyActive: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Capped at the pagination max (100) — plenty for the badge count and for
  // deciding heart state on any product actually visible on screen; a user
  // with a bigger wishlist just won't have items past that reflected here
  // until they're paged into on the wishlist page itself.
  const refresh = useCallback(async () => {
    if (!user) {
      setIds(new Set());
      setLoaded(false);
      return;
    }
    try {
      const res = await api<{ items: WishlistItem[] }>("/api/wishlist", { query: { limit: 100 } });
      setIds(new Set(res.items.map((item) => item.product_id)));
    } catch {
      // Endpoint hiccup shouldn't break navigation; the badge/hearts just
      // fall back to whatever the product API told them (see isWishlisted).
      setIds(new Set());
    } finally {
      setLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => {
      refresh();
    });
  }, [refresh]);

  const isWishlisted = useCallback(
    (productId: number, fallback = false) => (loaded ? ids.has(productId) : fallback),
    [ids, loaded]
  );

  // currentlyActive is supplied by the caller (usually `isWishlisted(id,
  // item.is_wishlisted)`) so the optimistic flip goes the right direction
  // even before this context's own fetch has landed.
  const toggleWishlist = useCallback(async (productId: number, currentlyActive: boolean) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (currentlyActive) next.delete(productId);
      else next.add(productId);
      return next;
    });
    setLoaded(true);

    try {
      if (currentlyActive) {
        await api(`/api/wishlist/${productId}`, { method: "DELETE" });
      } else {
        await api("/api/wishlist", { method: "POST", body: { product_id: productId } });
      }
    } catch (err) {
      // Revert the optimistic flip on failure.
      setIds((prev) => {
        const next = new Set(prev);
        if (currentlyActive) next.add(productId);
        else next.delete(productId);
        return next;
      });
      throw err instanceof ApiError ? err : new Error("Gagal memperbarui wishlist");
    }
  }, []);

  return (
    <WishlistContext.Provider value={{ count: ids.size, loaded, isWishlisted, toggleWishlist, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
