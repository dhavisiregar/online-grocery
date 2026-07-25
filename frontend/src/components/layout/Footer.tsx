import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-brand-dark">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-soft">
              🛒
            </span>
            GrocerGo
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/70">
            Belanja kebutuhan harian dari toko terdekat, diantar sampai ke rumah
            Anda.
          </p>
        </div>

        <FooterColumn
          title="Belanja"
          links={[
            { href: "/products", label: "Semua Produk" },
            { href: "/cart", label: "Keranjang" },
            { href: "/profile", label: "Pesanan Saya" },
          ]}
        />
        <FooterColumn
          title="Akun"
          links={[
            { href: "/login", label: "Masuk" },
            { href: "/register", label: "Daftar" },
            { href: "/reset-password", label: "Lupa Password" },
          ]}
        />
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Hubungi Kami
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-foreground/70">
            <li>support@grocergo.local</li>
            <li>+62 21 5550 1234</li>
            <li>Senin - Minggu, 08.00 - 21.00</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-4 py-5 text-center text-xs text-foreground/50">
        © {new Date().getFullYear()} GrocerGo. Online Grocery Web App.
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-foreground/70">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="transition-colors hover:text-brand-dark">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
