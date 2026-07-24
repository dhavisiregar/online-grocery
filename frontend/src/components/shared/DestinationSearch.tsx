"use client";

import { useEffect, useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { inputClass } from "@/components/auth/AuthCard";
import type { Destination } from "@/types";

export function DestinationSearch({
  placeholder = "Cari kecamatan/kota (mis. Kebayoran Baru)",
  onSelect,
}: {
  placeholder?: string;
  onSelect: (destination: Destination) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Destination[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length < 3) {
        setResults([]);
        return;
      }
      setLoading(true);
      setError(null);
      api<Destination[]>("/api/destinations/search", { query: { q: query } })
        .then((res) => {
          setResults(res);
          setOpen(true);
        })
        .catch((err) => {
          setError(err instanceof ApiError ? err.message : "Pencarian gagal");
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(d: Destination) {
    setQuery(d.label);
    setOpen(false);
    onSelect(d);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        className={inputClass}
      />
      {loading && <p className="mt-1 text-xs text-foreground/50">Mencari…</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-background shadow-lg">
          {results.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => handleSelect(d)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-surface"
              >
                {d.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
