"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const NAV_LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/products", label: "Produk" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
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
