import Link from "next/link";

import { Hero } from "@/components/home/Hero";
import { LocationBanner } from "@/components/home/LocationBanner";
import { ProductGrid } from "@/components/product/ProductGrid";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />

      <section className="mx-auto w-full max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Produk Pilihan</h2>
            <LocationBanner />
          </div>
          <Link href="/products" className="text-sm font-medium text-brand-dark hover:underline">
            Lihat semua produk →
          </Link>
        </div>

        <div className="mt-6">
          <ProductGrid limit={8} />
        </div>
      </section>
    </div>
  );
}
