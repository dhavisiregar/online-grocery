"use client";

import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types";

interface AdminCard {
  href: string;
  label: string;
  desc: string;
  roles: Role[];
}

const CARDS: AdminCard[] = [
  { href: "/admin/products", label: "Produk", desc: "Kelola katalog produk", roles: ["super_admin", "store_admin"] },
  { href: "/admin/categories", label: "Kategori", desc: "Kelola kategori produk", roles: ["super_admin", "store_admin"] },
  { href: "/admin/inventory", label: "Stok", desc: "Riwayat & penyesuaian stok", roles: ["super_admin", "store_admin"] },
  { href: "/admin/discounts", label: "Diskon & Voucher", desc: "Atur promo toko", roles: ["super_admin", "store_admin"] },
  { href: "/admin/orders", label: "Pesanan", desc: "Proses pesanan masuk", roles: ["super_admin", "store_admin"] },
  { href: "/admin/reports", label: "Laporan", desc: "Penjualan & stok", roles: ["super_admin", "store_admin"] },
  { href: "/admin/stores", label: "Toko", desc: "Kelola cabang toko", roles: ["super_admin"] },
  { href: "/admin/store-admins", label: "Store Admin", desc: "Tempatkan admin ke toko", roles: ["super_admin"] },
  { href: "/admin/users", label: "Pengguna", desc: "Semua pengguna terdaftar", roles: ["super_admin"] },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const cards = CARDS.filter((c) => !user || c.roles.includes(user.role));

  return (
    <div>
      <h1 className="text-xl font-bold">
        Dashboard {user?.role === "super_admin" ? "Super Admin" : "Store Admin"}
      </h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-border p-4 hover:border-brand hover:shadow-sm"
          >
            <p className="font-semibold">{card.label}</p>
            <p className="mt-1 text-sm text-foreground/60">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
