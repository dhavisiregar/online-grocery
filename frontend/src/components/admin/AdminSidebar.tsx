"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import type { Role } from "@/types";

interface AdminLink {
  href: string;
  label: string;
  roles: Role[];
}

const LINKS: (AdminLink & { icon: string })[] = [
  { href: "/admin", label: "Dashboard", icon: "📊", roles: ["super_admin", "store_admin"] },
  { href: "/admin/products", label: "Produk", icon: "🥬", roles: ["super_admin", "store_admin"] },
  { href: "/admin/categories", label: "Kategori", icon: "🏷️", roles: ["super_admin", "store_admin"] },
  { href: "/admin/inventory", label: "Stok", icon: "📦", roles: ["super_admin", "store_admin"] },
  { href: "/admin/discounts", label: "Diskon & Voucher", icon: "🎟️", roles: ["super_admin", "store_admin"] },
  { href: "/admin/orders", label: "Pesanan", icon: "🧾", roles: ["super_admin", "store_admin"] },
  { href: "/admin/reports", label: "Laporan", icon: "📈", roles: ["super_admin", "store_admin"] },
  { href: "/admin/stores", label: "Toko", icon: "🏬", roles: ["super_admin"] },
  { href: "/admin/store-admins", label: "Store Admin", icon: "🧑‍💼", roles: ["super_admin"] },
  { href: "/admin/users", label: "Pengguna", icon: "👥", roles: ["super_admin"] },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const links = LINKS.filter((l) => !user || l.roles.includes(user.role));

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border p-2 md:w-60 md:flex-col md:border-b-0 md:border-r md:p-4">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-brand text-white shadow-soft"
                : "text-foreground/70 hover:bg-surface hover:text-foreground"
            }`}
          >
            <span aria-hidden>{link.icon}</span>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
