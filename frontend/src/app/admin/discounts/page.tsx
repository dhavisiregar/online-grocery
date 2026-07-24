"use client";

import { useState } from "react";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { StatusNotice } from "@/components/admin/StatusNotice";

interface DiscountRow {
  id: number;
  type: string;
  value_type: string;
  value: number;
}
interface VoucherRow {
  id: number;
  code: string;
  type: string;
}

export default function AdminDiscountsPage() {
  const [tab, setTab] = useState<"discounts" | "vouchers">("discounts");
  const discounts = usePaginatedApi<DiscountRow>("/api/admin/discounts");
  const vouchers = usePaginatedApi<VoucherRow>("/api/admin/discounts/vouchers");
  const active = tab === "discounts" ? discounts : vouchers;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Diskon &amp; Voucher</h1>
        <button
          type="button"
          disabled
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white opacity-50"
        >
          + Buat {tab === "discounts" ? "Diskon" : "Voucher"}
        </button>
      </div>

      <div className="mt-4 flex gap-2 border-b border-border">
        <TabButton active={tab === "discounts"} onClick={() => setTab("discounts")} label="Diskon Produk" />
        <TabButton active={tab === "vouchers"} onClick={() => setTab("vouchers")} label="Voucher" />
      </div>

      {!active.loading && active.error && (
        <div className="mt-4">
          <StatusNotice message={active.error} />
        </div>
      )}
      {active.loading && <p className="mt-4 text-sm text-foreground/60">Memuat…</p>}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        active ? "border-brand text-brand-dark" : "border-transparent text-foreground/60"
      }`}
    >
      {label}
    </button>
  );
}
