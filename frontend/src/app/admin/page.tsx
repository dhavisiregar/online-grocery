"use client";

import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types";

interface AdminCard {
  href: string;
  label: string;
  desc: string;
  icon: string;
  roles: Role[];
}

const CARDS: AdminCard[] = [
  { href: "/admin/products", label: "Produk", desc: "Kelola katalog produk", icon: "🥬", roles: ["super_admin", "store_admin"] },
  { href: "/admin/categories", label: "Kategori", desc: "Kelola kategori produk", icon: "🏷️", roles: ["super_admin", "store_admin"] },
  { href: "/admin/inventory", label: "Stok", desc: "Riwayat & penyesuaian stok", icon: "📦", roles: ["super_admin", "store_admin"] },
  { href: "/admin/discounts", label: "Diskon & Voucher", desc: "Atur promo toko", icon: "🎟️", roles: ["super_admin", "store_admin"] },
  { href: "/admin/orders", label: "Pesanan", desc: "Proses pesanan masuk", icon: "🧾", roles: ["super_admin", "store_admin"] },
  { href: "/admin/reports", label: "Laporan", desc: "Penjualan & stok", icon: "📈", roles: ["super_admin", "store_admin"] },
  { href: "/admin/stores", label: "Toko", desc: "Kelola cabang toko", icon: "🏬", roles: ["super_admin"] },
  { href: "/admin/store-admins", label: "Store Admin", desc: "Tempatkan admin ke toko", icon: "🧑‍💼", roles: ["super_admin"] },
  { href: "/admin/users", label: "Pengguna", desc: "Semua pengguna terdaftar", icon: "👥", roles: ["super_admin"] },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const cards = CARDS.filter((c) => !user || c.roles.includes(user.role));

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">
        Dashboard {user?.role === "super_admin" ? "Super Admin" : "Store Admin"}
      </h1>
      <p className="mt-1 text-sm text-foreground/60">Kelola toko, katalog, dan pesanan dari satu tempat.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-start gap-3.5 rounded-2xl border border-border bg-background p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-soft-lg"
          >
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-light text-xl transition-colors group-hover:bg-brand group-hover:text-white"
            >
              {card.icon}
            </span>
            <div>
              <p className="font-semibold">{card.label}</p>
              <p className="mt-0.5 text-sm text-foreground/60">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
