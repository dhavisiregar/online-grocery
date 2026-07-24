import Link from "next/link";

import type { ProductWithStock } from "@/types";
import { formatIDR } from "@/lib/format";

export function ProductCard({ item }: { item: ProductWithStock }) {
  const { product, stock } = item;
  const outOfStock = stock <= 0;
  const image = product.images?.[0]?.image_url;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-background transition hover:shadow-md"
    >
      <div className="flex aspect-square items-center justify-center bg-surface text-4xl">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>🛒</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.category && (
          <span className="text-xs font-medium text-brand-dark">{product.category.name}</span>
        )}
        <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-semibold">{formatIDR(product.price)}</span>
          {outOfStock ? (
            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              Stok habis
            </span>
          ) : (
            <span className="rounded bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-dark">
              Stok {stock}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
