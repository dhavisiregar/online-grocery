export function AuthSplitLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] md:grid-cols-2">
      {/* Decorative brand panel — hidden on mobile, where the form alone
          is plenty; the wordmark reappears above the form there instead. */}
      <div className="relative hidden overflow-hidden bg-linear-to-br from-brand to-brand-dark px-12 py-16 text-white md:flex md:flex-col md:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -bottom-32 h-96 w-96 rounded-full bg-black/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-2xl backdrop-blur-sm">
            🛒
          </span>
          GrocerGo
        </div>

        <div className="relative">
          <h2 className="max-w-sm text-3xl leading-tight font-bold tracking-tight text-balance">
            Belanja kebutuhan harian, diantar dari toko terdekat Anda.
          </h2>
          <ul className="mt-8 flex flex-col gap-4 text-sm text-white/90">
            <FeatureItem icon="📍" text="Produk dari toko cabang terdekat lokasi Anda" />
            <FeatureItem icon="💳" text="Bayar aman lewat Midtrans — kartu, VA, e-wallet, QRIS" />
            <FeatureItem icon="🎟️" text="Diskon & voucher eksklusif tiap belanja" />
          </ul>
        </div>

        <p className="relative text-xs text-white/60">© {new Date().getFullYear()} GrocerGo</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center px-4 py-12 sm:px-8 md:px-16">
        <div className="animate-scale-in mx-auto w-full max-w-sm">
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-brand-dark md:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-soft">
              🛒
            </span>
            GrocerGo
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight md:mt-0">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-foreground/60">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-base backdrop-blur-sm"
      >
        {icon}
      </span>
      <span className="pt-1">{text}</span>
    </li>
  );
}
