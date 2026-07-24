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

const LINKS: AdminLink[] = [
  { href: "/admin", label: "Dashboard", roles: ["super_admin", "store_admin"] },
  { href: "/admin/products", label: "Produk", roles: ["super_admin", "store_admin"] },
  { href: "/admin/categories", label: "Kategori", roles: ["super_admin", "store_admin"] },
  { href: "/admin/inventory", label: "Stok", roles: ["super_admin", "store_admin"] },
  { href: "/admin/discounts", label: "Diskon & Voucher", roles: ["super_admin", "store_admin"] },
  { href: "/admin/orders", label: "Pesanan", roles: ["super_admin", "store_admin"] },
  { href: "/admin/reports", label: "Laporan", roles: ["super_admin", "store_admin"] },
  { href: "/admin/stores", label: "Toko", roles: ["super_admin"] },
  { href: "/admin/store-admins", label: "Store Admin", roles: ["super_admin"] },
  { href: "/admin/users", label: "Pengguna", roles: ["super_admin"] },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const links = LINKS.filter((l) => !user || l.roles.includes(user.role));

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border p-2 md:w-56 md:flex-col md:border-b-0 md:border-r md:p-4">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
              active ? "bg-brand-light text-brand-dark" : "text-foreground/70 hover:bg-surface"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
