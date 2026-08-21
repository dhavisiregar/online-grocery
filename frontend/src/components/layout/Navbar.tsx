"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useLoyalty } from "@/contexts/LoyaltyContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import type { LoyaltyTier, Notification } from "@/types";

const TIER_ICON: Record<LoyaltyTier, string> = { bronze: "🥉", silver: "🥈", gold: "🥇" };

const NAV_LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/products", label: "Produk" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { unreadCount } = useNotifications();
  const { summary: loyalty } = useLoyalty();
  const isAdmin = user?.role === "super_admin" || user?.role === "store_admin";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-brand-dark transition-transform hover:scale-[1.02]"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-soft">
            🛒
          </span>
          GrocerGo
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface hover:text-brand-dark"
            >
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface hover:text-brand-dark"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <ThemeToggle />
          {user && loyalty && <LoyaltyBadge summary={loyalty} />}
          {user && <NotificationBell />}
          <WishlistLink count={wishlistCount} />
          <CartLink itemCount={itemCount} />
          <AuthArea user={user} onLogout={logout} />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border transition-colors hover:bg-surface"
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden>{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="animate-slide-up border-t border-border px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                Admin
              </Link>
            )}
            {user && loyalty && (
              <Link
                href="/account/loyalty"
                className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                {TIER_ICON[loyalty.tier]} {loyalty.points} poin
              </Link>
            )}
            {user && (
              <Link
                href="/notifications"
                className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                Notifikasi {unreadCount > 0 && `(${unreadCount})`}
              </Link>
            )}
            <Link
              href="/wishlist"
              className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              Wishlist {wishlistCount > 0 && `(${wishlistCount})`}
            </Link>
            <Link
              href="/cart"
              className="rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              Keranjang {itemCount > 0 && `(${itemCount})`}
            </Link>
            <div className="mt-2 border-t border-border pt-3">
              <AuthArea user={user} onLogout={logout} />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function CartLink({ itemCount }: { itemCount: number }) {
  return (
    <Link
      href="/cart"
      className="relative rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface hover:text-brand-dark"
      aria-label="Cart"
    >
      <span aria-hidden>🛍️ Keranjang</span>
      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white shadow-soft">
          {itemCount}
        </span>
      )}
    </Link>
  );
}

function WishlistLink({ count }: { count: number }) {
  return (
    <Link
      href="/wishlist"
      className="relative rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface hover:text-brand-dark"
      aria-label="Wishlist"
    >
      <span aria-hidden>❤️ Wishlist</span>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white shadow-soft">
          {count}
        </span>
      )}
    </Link>
  );
}

function LoyaltyBadge({ summary }: { summary: NonNullable<ReturnType<typeof useLoyalty>["summary"]> }) {
  return (
    <Link
      href="/account/loyalty"
      className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface hover:text-brand-dark"
      aria-label="Poin loyalty"
    >
      <span aria-hidden>{TIER_ICON[summary.tier]}</span>
      {summary.points} poin
    </Link>
  );
}

function NotificationBell() {
  const router = useRouter();
  const { unreadCount, recent, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleClickNotification(n: Notification) {
    setOpen(false);
    if (!n.is_read) await markAsRead(n.id);
    if (n.type === "order_status" && n.related_id) {
      router.push(`/orders/${n.related_id}`);
    } else if (n.type === "promo" && n.related_id) {
      router.push(`/products/${n.related_id}`);
    } else {
      router.push("/notifications");
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifikasi"
        className="relative rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface hover:text-brand-dark"
      >
        <span aria-hidden>🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white shadow-soft">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-slide-up absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-background shadow-soft-lg">
          <div className="flex items-center justify-between border-b border-border p-3">
            <span className="text-sm font-semibold">Notifikasi</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="text-xs font-medium text-brand-dark hover:underline"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="p-4 text-center text-sm text-foreground/60">Belum ada notifikasi.</p>
            ) : (
              recent.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClickNotification(n)}
                  className={`flex w-full flex-col gap-0.5 border-b border-border px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-surface ${
                    n.is_read ? "" : "bg-brand-light/40"
                  }`}
                >
                  <span className="font-medium">{n.title}</span>
                  <span className="line-clamp-2 text-xs text-foreground/60">{n.body}</span>
                </button>
              ))
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-border p-2.5 text-center text-sm font-medium text-brand-dark hover:bg-surface"
          >
            Lihat semua
          </Link>
        </div>
      )}
    </div>
  );
}

function AuthArea({
  user,
  onLogout,
}: {
  user: ReturnType<typeof useAuth>["user"];
  onLogout: () => void;
}) {
  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Link
          href="/login"
          className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface hover:text-brand-dark"
        >
          Masuk
        </Link>
        <Link
          href="/register"
          className="ml-1 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0"
        >
          Daftar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/profile"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-surface hover:text-brand-dark"
      >
        {user.name.split(" ")[0]}
        {!user.is_verified && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            belum verifikasi
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/60 transition-colors hover:bg-surface hover:text-foreground"
      >
        Keluar
      </button>
    </div>
  );
}
