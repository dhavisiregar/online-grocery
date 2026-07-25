"use client";

import type { Category } from "@/types";

interface Props {
  search: string;
  onSearch: (value: string) => void;
  categories: Category[];
  categoryId: number | undefined;
  onCategory: (value: number | undefined) => void;
}

export function ProductFilters({ search, onSearch, categories, categoryId, onCategory }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40">
          🔍
        </span>
        <input
          type="search"
          placeholder="Cari produk..."
          defaultValue={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition-shadow placeholder:text-foreground/40 focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
      </div>
      <select
        value={categoryId ?? ""}
        onChange={(e) => onCategory(e.target.value ? Number(e.target.value) : undefined)}
        className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand/25 sm:w-52"
      >
        <option value="">Semua Kategori</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
    </div>
  );
}
