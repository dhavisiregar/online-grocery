import { ProductGrid } from "@/components/product/ProductGrid";

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Semua Produk</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Menampilkan produk dan stok dari toko terdekat lokasi Anda.
      </p>
      <div className="mt-6">
        <ProductGrid limit={12} showFilters />
      </div>
    </div>
  );
}
