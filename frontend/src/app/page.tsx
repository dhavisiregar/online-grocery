import Link from "next/link";

import { Hero } from "@/components/home/Hero";
import { LocationBanner } from "@/components/home/LocationBanner";
import { ProductGrid } from "@/components/product/ProductGrid";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Produk Pilihan</h2>
            <LocationBanner />
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark transition-transform hover:translate-x-0.5"
          >
            Lihat semua produk <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="mt-6">
          <ProductGrid limit={8} />
        </div>
      </section>
    </div>
  );
}
