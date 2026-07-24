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
      <input
        type="search"
        placeholder="Cari produk..."
        defaultValue={search}
        onChange={(e) => onSearch(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm sm:max-w-xs"
      />
      <select
        value={categoryId ?? ""}
        onChange={(e) => onCategory(e.target.value ? Number(e.target.value) : undefined)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm sm:w-52"
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
