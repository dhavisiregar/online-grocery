"use client";

import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks?: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

const SNAP_SRC =
  process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
const CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";

function loadSnapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.snap) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SNAP_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Gagal memuat Snap.js")));
      return;
    }
    const script = document.createElement("script");
    script.src = SNAP_SRC;
    script.setAttribute("data-client-key", CLIENT_KEY);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat Snap.js"));
    document.body.appendChild(script);
  });
}

export function MidtransPayButton({
  orderId,
  onSettled,
}: {
  orderId: string;
  onSettled: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSnapScript().catch(() => setMessage("Gagal memuat layanan pembayaran"));
  }, []);

  async function handlePay() {
    setStatus("loading");
    setMessage(null);
    try {
      const { token } = await api<{ token: string; redirect_url: string }>(
        `/api/orders/${orderId}/midtrans-token`,
        { method: "POST" },
      );
      await loadSnapScript();

      window.snap?.pay(token, {
        onSuccess: () => syncAndSettle(),
        onPending: () => syncAndSettle(),
        onError: () => {
          setStatus("error");
          setMessage("Pembayaran gagal, silakan coba lagi.");
        },
        onClose: () => setStatus("idle"),
      });
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof ApiError ? err.message : "Gagal memulai pembayaran");
    }
  }

  async function syncAndSettle() {
    try {
      await api(`/api/orders/${orderId}/payment-status`);
    } finally {
      setStatus("idle");
      onSettled();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handlePay}
        disabled={status === "loading"}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {status === "loading" ? "Membuka pembayaran…" : "Bayar Sekarang"}
      </button>
      {message && <p className="text-sm text-red-600">{message}</p>}
    </div>
  );
}
