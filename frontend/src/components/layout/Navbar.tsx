"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-dark">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            🛒
          </span>
          FreshMart
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium hover:text-brand-dark">
              {link.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className="text-sm font-medium hover:text-brand-dark">
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <CartLink itemCount={itemCount} />
          <AuthArea user={user} onLogout={logout} />
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-border md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden>{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium" onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link href="/admin" className="text-sm font-medium" onClick={() => setOpen(false)}>
                Admin
              </Link>
            )}
            <Link href="/cart" className="text-sm font-medium" onClick={() => setOpen(false)}>
              Keranjang {itemCount > 0 && `(${itemCount})`}
            </Link>
            <div className="pt-2">
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
    <Link href="/cart" className="relative text-sm font-medium hover:text-brand-dark" aria-label="Cart">
      <span aria-hidden>🛍️ Keranjang</span>
      {itemCount > 0 && (
        <span className="absolute -right-3 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white">
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
      <div className="flex items-center gap-2">
        <Link href="/login" className="text-sm font-medium hover:text-brand-dark">
          Masuk
        </Link>
        <Link
          href="/register"
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Daftar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/profile" className="text-sm font-medium hover:text-brand-dark">
        {user.name.split(" ")[0]}
        {!user.is_verified && (
          <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
            belum verifikasi
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="text-sm font-medium text-foreground/70 hover:text-brand-dark"
      >
        Keluar
      </button>
    </div>
  );
}
