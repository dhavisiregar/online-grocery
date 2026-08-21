"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { LoyaltyProvider } from "@/contexts/LoyaltyContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WishlistProvider } from "@/contexts/WishlistContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocationProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <NotificationProvider>
                <LoyaltyProvider>{children}</LoyaltyProvider>
              </NotificationProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </LocationProvider>
    </ThemeProvider>
  );
}
