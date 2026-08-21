"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { api, ApiError } from "@/lib/api";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { primaryButtonClass } from "@/components/auth/AuthCard";
import { useLoyalty } from "@/contexts/LoyaltyContext";
import { notifyError, notifySuccess } from "@/lib/alerts";
import { formatIDR } from "@/lib/format";
import type { CartItem, Order, PricingPreview, ProductWithStock, ShippingOption, UserAddress, UserVoucher } from "@/types";

// Must match backend service.MinRedeemPoints / RupiahPerRedeemedPoint —
// redemption always happens in whole multiples of this, at this value.
const MIN_REDEEM_POINTS = 100;
const RUPIAH_PER_REDEEMED_POINT = 100;

export default function CheckoutPage() {
  return (
    <RequireAuth requireVerified>
      <Suspense>
        <CheckoutContent />
      </Suspense>
    </RequireAuth>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const buyNowProductId = searchParams.get("product_id");
  const buyNowStoreId = searchParams.get("store_id");
  const buyNowQty = Math.max(1, Number(searchParams.get("quantity") ?? "1"));
  const isBuyNow = Boolean(buyNowProductId && buyNowStoreId);

  const [items, setItems] = useState<CartItem[] | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[] | null>(null);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[] | null>(null);
  const [selected, setSelected] = useState<ShippingOption | null>(null);
  const [vouchers, setVouchers] = useState<UserVoucher[]>([]);
  const [voucherId, setVoucherId] = useState<number | null>(null);
  const { summary: loyalty, refresh: refreshLoyalty } = useLoyalty();
  const [redeeming, setRedeeming] = useState(false);
  const [pricing, setPricing] = useState<PricingPreview | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isBuyNow) {
      api<ProductWithStock>(`/api/products/${buyNowProductId}`, {
        auth: false,
        query: { store_id: buyNowStoreId ?? undefined },
      })
        .then((res) =>
          setItems([
            {
              id: 0,
              product_id: res.product.id,
              store_id: res.store_id,
              quantity: buyNowQty,
              product: res.product,
            },
          ]),
        )
        .catch(() => setItems([]));
    } else {
      api<CartItem[]>("/api/cart").then(setItems).catch(() => setItems([]));
    }

    api<UserAddress[]>("/api/addresses")
      .then((res) => {
        setAddresses(res);
        const primary = res.find((a) => a.is_primary) ?? res[0];
        if (primary) setAddressId(primary.id);
      })
      .catch(() => setAddresses([]));

    api<{ items: UserVoucher[] }>("/api/vouchers/mine")
      .then((res) => setVouchers(res.items))
      .catch(() => setVouchers([]));
  }, [isBuyNow, buyNowProductId, buyNowStoreId, buyNowQty]);

  useEffect(() => {
    queueMicrotask(() => {
      if (!addressId) {
        setShippingOptions(null);
        setSelected(null);
        return;
      }
      api<ShippingOption[]>(`/api/addresses/${addressId}/shipping-options`)
        .then((options) => {
          setShippingOptions(options);
          setSelected(options[0] ?? null);
        })
        .catch(() => {
          setShippingOptions(null);
          setSelected(null);
        });
    });
  }, [addressId]);

  // Live pricing preview — the authoritative subtotal/discount/total, so
  // the summary always matches what committing the order would charge.
  useEffect(() => {
    queueMicrotask(() => {
      if (!addressId || !selected) {
        setPricing(null);
        return;
      }
      setPricingError(null);
      const body = {
        address_id: addressId,
        shipping_courier: selected.courier,
        shipping_service: selected.service,
        user_voucher_id: voucherId ?? undefined,
      };
      const previewPath = isBuyNow ? "/api/orders/buy-now/preview" : "/api/orders/preview";
      const previewBody = isBuyNow
        ? { ...body, product_id: Number(buyNowProductId), store_id: Number(buyNowStoreId), quantity: buyNowQty }
        : body;
      api<PricingPreview>(previewPath, { method: "POST", body: previewBody })
        .then(setPricing)
        .catch((err) => {
          setPricing(null);
          setPricingError(err instanceof ApiError ? err.message : "Gagal menghitung total pesanan");
        });
    });
  }, [addressId, selected, voucherId, isBuyNow, buyNowProductId, buyNowStoreId, buyNowQty]);

  const subtotal = pricing?.subtotal ?? items?.reduce((sum, i) => sum + (i.product?.price ?? 0) * i.quantity, 0) ?? 0;
  const shippingCost = pricing?.shipping_cost ?? selected?.cost ?? 0;
  const discountAmount = pricing?.discount_amount ?? 0;
  const total = pricing ? pricing.total : subtotal + shippingCost;

  async function handleSubmit() {
    if (!addressId) return;
    setStatus("loading");
    setMessage(null);
    try {
      const order = isBuyNow
        ? await api<Order>("/api/orders/buy-now", {
            method: "POST",
            body: {
              product_id: Number(buyNowProductId),
              store_id: Number(buyNowStoreId),
              quantity: buyNowQty,
              address_id: addressId,
              shipping_courier: selected?.courier,
              shipping_service: selected?.service,
              user_voucher_id: voucherId ?? undefined,
            },
          })
        : await api<Order>("/api/orders", {
            method: "POST",
            body: {
              address_id: addressId,
              shipping_courier: selected?.courier,
              shipping_service: selected?.service,
              user_voucher_id: voucherId ?? undefined,
            },
          });
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Gagal membuat pesanan");
    }
  }

  async function handleRedeemPoints() {
    if (!loyalty) return;
    const redeemable = Math.floor(loyalty.points / MIN_REDEEM_POINTS) * MIN_REDEEM_POINTS;
    if (redeemable < MIN_REDEEM_POINTS) return;

    setRedeeming(true);
    try {
      await api("/api/loyalty/redeem", { method: "POST", body: { points: redeemable } });
      notifySuccess(`${redeemable} poin ditukar menjadi voucher.`);
      const res = await api<{ items: UserVoucher[] }>("/api/vouchers/mine");
      setVouchers(res.items);
      refreshLoyalty();
    } catch (err) {
      notifyError(err instanceof ApiError ? err.message : "Gagal menukar poin");
    } finally {
      setRedeeming(false);
    }
  }

  if (items && items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <span aria-hidden className="text-4xl">
          🛒
        </span>
        <p className="mt-3 text-foreground/60">
          {isBuyNow ? "Produk tidak ditemukan." : "Keranjang Anda kosong."}
        </p>
        <Link
          href="/products"
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-dark hover:underline"
        >
          Mulai belanja <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>

      <div className="mt-6 flex flex-col gap-5">
        {isBuyNow && items && items[0] && (
          <Section title="Produk">
            <p className="text-sm">
              {items[0].product?.name} <span className="text-foreground/60">x{items[0].quantity}</span>
            </p>
          </Section>
        )}

        <Section title="Alamat Pengiriman">
          {addresses && addresses.length === 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground/60">Anda belum memiliki alamat tersimpan.</p>
              <Link href="/addresses" className="text-sm font-medium text-brand-dark hover:underline">
                Tambah alamat →
              </Link>
            </div>
          )}
          {addresses && addresses.length > 0 && (
            <div className="flex flex-col gap-2">
              {addresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition-colors ${
                    addressId === addr.id ? "border-brand bg-brand-light/40" : "border-border hover:bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={addressId === addr.id}
                    onChange={() => setAddressId(addr.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">{addr.label}</span> — {addr.recipient_name}
                    <br />
                    <span className="text-foreground/60">
                      {addr.address_line}, {addr.district}, {addr.city}
                    </span>
                  </span>
                </label>
              ))}
              <Link href="/addresses" className="mt-1 text-sm text-brand-dark hover:underline">
                + Tambah alamat baru
              </Link>
            </div>
          )}
        </Section>

        <Section title="Metode Pengiriman">
          {!shippingOptions && <p className="text-sm text-foreground/60">Pilih alamat untuk melihat opsi pengiriman.</p>}
          {shippingOptions && shippingOptions.length > 0 && (
            <div className="flex flex-col gap-2">
              {shippingOptions.map((opt) => (
                <label
                  key={`${opt.courier}-${opt.service}`}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 text-sm transition-colors ${
                    selected?.courier === opt.courier && selected?.service === opt.service
                      ? "border-brand bg-brand-light/40"
                      : "border-border hover:bg-surface"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      checked={selected?.courier === opt.courier && selected?.service === opt.service}
                      onChange={() => setSelected(opt)}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium">
                        {opt.courier_name} — {opt.description}
                      </span>
                      <br />
                      <span className="text-foreground/60">Estimasi {opt.etd}</span>
                    </span>
                  </span>
                  <span className="whitespace-nowrap font-medium">{formatIDR(opt.cost)}</span>
                </label>
              ))}
            </div>
          )}
        </Section>

        <Section title="Metode Pembayaran">
          <p className="text-sm text-foreground/70">
            Bayar Online via Midtrans — kartu kredit, transfer VA, e-wallet, atau QRIS.
          </p>
        </Section>

        <Section title="Voucher">
          {loyalty && loyalty.points >= MIN_REDEEM_POINTS && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-brand/40 bg-brand-light/20 p-3.5 text-sm">
              <span>
                Anda punya <span className="font-semibold">{loyalty.points} poin</span> — tukar{" "}
                {Math.floor(loyalty.points / MIN_REDEEM_POINTS) * MIN_REDEEM_POINTS} poin jadi voucher{" "}
                {formatIDR(
                  Math.floor(loyalty.points / MIN_REDEEM_POINTS) * MIN_REDEEM_POINTS * RUPIAH_PER_REDEEMED_POINT,
                )}
                .
              </span>
              <button
                type="button"
                onClick={handleRedeemPoints}
                disabled={redeeming}
                className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark disabled:opacity-60"
              >
                {redeeming ? "Menukar…" : "Tukar Poin"}
              </button>
            </div>
          )}
          {vouchers.length === 0 ? (
            <p className="text-sm text-foreground/60">
              Belum ada voucher tersimpan.{" "}
              <Link href="/profile" className="text-brand-dark hover:underline">
                Klaim kode promo →
              </Link>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 text-sm transition-colors ${
                  voucherId === null ? "border-brand bg-brand-light/40" : "border-border hover:bg-surface"
                }`}
              >
                <input type="radio" name="voucher" checked={voucherId === null} onChange={() => setVoucherId(null)} />
                Tidak pakai voucher
              </label>
              {vouchers.map((uv) => (
                <label
                  key={uv.id}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3.5 text-sm transition-colors ${
                    voucherId === uv.id ? "border-brand bg-brand-light/40" : "border-border hover:bg-surface"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input type="radio" name="voucher" checked={voucherId === uv.id} onChange={() => setVoucherId(uv.id)} />
                    <span>
                      <span className="font-mono font-medium">{uv.voucher.code}</span>
                      <br />
                      <span className="text-foreground/60">
                        {uv.voucher.value_type === "percentage" ? `${uv.voucher.value}%` : formatIDR(uv.voucher.value)}
                        {uv.voucher.type === "shipping" ? " ongkos kirim" : ""}
                      </span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
          {pricingError && <p className="mt-2 text-sm text-red-600">{pricingError}</p>}
        </Section>

        <Section title="Ringkasan Pesanan">
          <div className="flex justify-between text-sm">
            <span className="text-foreground/60">Subtotal</span>
            <span>{formatIDR(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-foreground/60">Diskon</span>
              <span className="text-red-600">-{formatIDR(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-foreground/60">Ongkos Kirim</span>
            <span>{selected ? formatIDR(shippingCost) : "-"}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold">
            <span>Total</span>
            <span>{formatIDR(total)}</span>
          </div>
        </Section>

        {status === "error" && message && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">{message}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === "loading" || !addressId || !selected}
          className={primaryButtonClass}
        >
          {status === "loading" ? "Memproses…" : "Buat Pesanan"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-soft">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
