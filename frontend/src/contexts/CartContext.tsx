"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { CartItem } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface CartContextValue {
  itemCount: number;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [itemCount, setItemCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setItemCount(0);
      return;
    }
    try {
      const items = await api<CartItem[]>("/api/cart");
      setItemCount(items.reduce((sum, item) => sum + item.quantity, 0));
    } catch {
      // Cart endpoint is still being built out; don't break the navbar for it.
      setItemCount(0);
    }
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => {
      refresh();
    });
  }, [refresh]);

  return <CartContext.Provider value={{ itemCount, refresh }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
