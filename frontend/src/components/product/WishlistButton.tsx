"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { notifyError } from "@/lib/alerts";

interface Props {
  productId: number;
  initialWishlisted?: boolean;
  className?: string;
}

// Heart toggle shared by the product card and the product detail page.
// Reads active state from WishlistContext once it has loaded (so toggling
// on one page stays in sync elsewhere), falling back to the product API's
// own is_wishlisted flag before that first load lands.
export function WishlistButton({ productId, initialWishlisted = false, className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [pending, setPending] = useState(false);

  const active = isWishlisted(productId, initialWishlisted);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setPending(true);
    try {
      await toggleWishlist(productId, active);
    } catch {
      notifyError("Gagal memperbarui wishlist");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={active}
      aria-label={active ? "Hapus dari wishlist" : "Tambah ke wishlist"}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-base shadow-soft backdrop-blur transition-transform hover:scale-110 disabled:opacity-60 ${className}`}
    >
      <span aria-hidden>{active ? "❤️" : "🤍"}</span>
    </button>
  );
}
