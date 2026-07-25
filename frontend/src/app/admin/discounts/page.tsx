"use client";

import { useEffect, useState } from "react";

import { usePaginatedApi } from "@/hooks/usePaginatedApi";
import { PaginationControls, StatusNotice } from "@/components/admin/StatusNotice";
import { Modal } from "@/components/admin/Modal";
import { DiscountForm } from "@/components/admin/DiscountForm";
import { VoucherForm } from "@/components/admin/VoucherForm";
import { EditButton, DeleteButton } from "@/components/ui/RowActions";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import {
  DISCOUNT_TYPE_LABEL,
  VOUCHER_TYPE_LABEL,
  type Discount,
  type Product,
  type Store,
  type Voucher,
} from "@/types";

export default function AdminDiscountsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [tab, setTab] = useState<"discounts" | "vouchers">("discounts");

  const discounts = usePaginatedApi<Discount>("/api/admin/discounts");
  const vouchers = usePaginatedApi<Voucher>("/api/admin/discounts/vouchers");

  const [products, setProducts] = useState<Record<number, string>>({});
  const [stores, setStores] = useState<Record<number, string>>({});
  const [editingDiscount, setEditingDiscount] = useState<Discount | "new" | null>(null);
  const [creatingVoucher, setCreatingVoucher] = useState(false);

  useEffect(() => {
    api<{ items: Product[] }>("/api/admin/products", { query: { limit: 100 } })
      .then((res) => setProducts(Object.fromEntries(res.items.map((p) => [p.id, p.name]))))
      .catch(() => setProducts({}));
    if (isSuperAdmin) {
      api<Store[]>("/api/stores", { auth: false })
        .then((res) => setStores(Object.fromEntries(res.map((s) => [s.id, s.name]))))
        .catch(() => setStores({}));
    }
  }, [isSuperAdmin]);

  async function handleDeleteDiscount(discount: Discount) {
    if (!window.confirm("Hapus diskon ini?")) return;
    try {
      await api(`/api/admin/discounts/${discount.id}`, { method: "DELETE" });
      discounts.reload();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Gagal menghapus diskon");
    }
  }

  const active = tab === "discounts" ? discounts : vouchers;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Diskon &amp; Voucher</h1>
        <button
          type="button"
          onClick={() => (tab === "discounts" ? setEditingDiscount("new") : setCreatingVoucher(true))}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0"
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

      {!active.loading && !active.error && tab === "discounts" && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-surface/80 text-left text-xs font-semibold uppercase tracking-wide text-foreground/60">
              <tr>
                {isSuperAdmin && <th className="p-3">Toko</th>}
                <th className="p-3">Jenis</th>
                <th className="p-3">Target</th>
                <th className="p-3">Nilai</th>
                <th className="p-3">Periode</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {discounts.items.map((d) => (
                <tr key={d.id} className="border-t border-border transition-colors hover:bg-surface/50">
                  {isSuperAdmin && <td className="p-3 text-foreground/60">{stores[d.store_id] ?? `#${d.store_id}`}</td>}
                  <td className="p-3">{DISCOUNT_TYPE_LABEL[d.type]}</td>
                  <td className="p-3 text-foreground/60">
                    {d.product_id ? (products[d.product_id] ?? `Produk #${d.product_id}`) : "Seluruh toko"}
                  </td>
                  <td className="p-3">
                    {d.type === "buy_one_get_one"
                      ? "-"
                      : d.value_type === "percentage"
                        ? `${d.value}%`
                        : formatIDR(d.value)}
                    {d.min_purchase ? (
                      <span className="block text-xs text-foreground/50">min. {formatIDR(d.min_purchase)}</span>
                    ) : null}
                  </td>
                  <td className="p-3 text-foreground/60">
                    {new Date(d.start_date).toLocaleDateString("id-ID")} –{" "}
                    {new Date(d.end_date).toLocaleDateString("id-ID")}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <EditButton onClick={() => setEditingDiscount(d)} />
                      <DeleteButton onClick={() => handleDeleteDiscount(d)} />
                    </div>
                  </td>
                </tr>
              ))}
              {discounts.items.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="p-6 text-center text-foreground/50">
                    Belum ada diskon.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {!active.loading && !active.error && tab === "vouchers" && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-surface/80 text-left text-xs font-semibold uppercase tracking-wide text-foreground/60">
              <tr>
                <th className="p-3">Kode</th>
                <th className="p-3">Jenis</th>
                <th className="p-3">Nilai</th>
                <th className="p-3">Kedaluwarsa</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.items.map((v) => (
                <tr key={v.id} className="border-t border-border transition-colors hover:bg-surface/50">
                  <td className="p-3 font-mono font-medium">{v.code}</td>
                  <td className="p-3">{VOUCHER_TYPE_LABEL[v.type]}</td>
                  <td className="p-3">
                    {v.value_type === "percentage" ? `${v.value}%` : formatIDR(v.value)}
                    {v.max_discount ? (
                      <span className="block text-xs text-foreground/50">maks. {formatIDR(v.max_discount)}</span>
                    ) : null}
                  </td>
                  <td className="p-3 text-foreground/60">{new Date(v.expires_at).toLocaleDateString("id-ID")}</td>
                </tr>
              ))}
              {vouchers.items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-foreground/50">
                    Belum ada voucher.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "discounts" && discounts.pagination && (
        <PaginationControls page={discounts.page} pagination={discounts.pagination} onPage={discounts.setPage} />
      )}
      {tab === "vouchers" && vouchers.pagination && (
        <PaginationControls page={vouchers.page} pagination={vouchers.pagination} onPage={vouchers.setPage} />
      )}

      {editingDiscount !== null && (
        <Modal
          title={editingDiscount === "new" ? "Buat Diskon" : "Edit Diskon"}
          onClose={() => setEditingDiscount(null)}
        >
          <DiscountForm
            discount={editingDiscount === "new" ? null : editingDiscount}
            onSaved={() => {
              setEditingDiscount(null);
              discounts.reload();
            }}
          />
        </Modal>
      )}

      {creatingVoucher && (
        <Modal title="Buat Voucher" onClose={() => setCreatingVoucher(false)}>
          <VoucherForm
            onSaved={() => {
              setCreatingVoucher(false);
              vouchers.reload();
            }}
          />
        </Modal>
      )}
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
