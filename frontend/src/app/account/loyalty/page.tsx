"use client";

import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { formatIDR } from "@/lib/format";
import type { LoyaltySummary, LoyaltyTier, Pagination, PointsJournalEntry, PointsReason } from "@/types";

const TIER_STYLE: Record<LoyaltyTier, { label: string; icon: string; badgeClass: string; barClass: string }> = {
  bronze: { label: "Bronze", icon: "🥉", badgeClass: "bg-amber-100 text-amber-800", barClass: "bg-amber-500" },
  silver: { label: "Silver", icon: "🥈", badgeClass: "bg-slate-200 text-slate-700", barClass: "bg-slate-400" },
  gold: { label: "Gold", icon: "🥇", badgeClass: "bg-yellow-100 text-yellow-800", barClass: "bg-yellow-500" },
};

const REASON_LABEL: Record<PointsReason, string> = {
  order_completed: "Belanja selesai",
  redeemed: "Ditukar voucher",
  expired: "Kedaluwarsa",
  adjustment: "Penyesuaian",
};

export default function LoyaltyPage() {
  return (
    <RequireAuth redirectToLogin>
      <LoyaltyContent />
    </RequireAuth>
  );
}

function LoyaltyContent() {
  const [summary, setSummary] = useState<LoyaltySummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [history, setHistory] = useState<PointsJournalEntry[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      api<LoyaltySummary>("/api/loyalty/me")
        .then(setSummary)
        .catch((err) => setSummaryError(err instanceof ApiError ? err.message : "Gagal memuat data loyalty"));
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      api<{ items: PointsJournalEntry[]; pagination: Pagination }>("/api/loyalty/history", {
        query: { page, limit: 10 },
      })
        .then((res) => {
          setHistory(res.items);
          setPagination(res.pagination);
        })
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    });
  }, [page]);

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Loyalty & Membership</h1>

      {summaryError && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {summaryError}
        </div>
      )}

      {summary && (
        <div className="mt-6 rounded-2xl border border-border bg-background p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/60">Poin Anda</p>
              <p className="text-3xl font-bold">{summary.points.toLocaleString("id-ID")}</p>
            </div>
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${TIER_STYLE[summary.tier].badgeClass}`}
            >
              <span aria-hidden>{TIER_STYLE[summary.tier].icon}</span>
              {TIER_STYLE[summary.tier].label}
            </span>
          </div>

          <div className="mt-5">
            {summary.next_tier_threshold ? (
              <>
                <div className="flex justify-between text-xs text-foreground/60">
                  <span>Total belanja {formatIDR(summary.total_spend)}</span>
                  <span>Target {formatIDR(summary.next_tier_threshold)}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                  <div
                    className={`h-full rounded-full ${TIER_STYLE[summary.tier].barClass}`}
                    style={{ width: `${summary.progress_percent}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-foreground/60">
                  Belanja {formatIDR(Math.max(0, summary.next_tier_threshold - summary.total_spend))} lagi untuk naik
                  tier.
                </p>
              </>
            ) : (
              <p className="text-xs text-foreground/60">Anda sudah berada di tier tertinggi. 🎉</p>
            )}
          </div>
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-foreground/50">Riwayat Poin</h2>

      {loading && <HistorySkeleton />}

      {!loading && history && history.length === 0 && (
        <p className="mt-4 text-sm text-foreground/60">Belum ada riwayat poin.</p>
      )}

      {!loading && history && history.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-background p-4 shadow-soft"
            >
              <div>
                <p className="text-sm font-medium">{REASON_LABEL[entry.reason]}</p>
                <p className="text-xs text-foreground/50">{new Date(entry.created_at).toLocaleString("id-ID")}</p>
              </div>
              <span className={`text-sm font-semibold ${entry.points >= 0 ? "text-brand-dark" : "text-red-600"}`}>
                {entry.points >= 0 ? "+" : ""}
                {entry.points}
              </span>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.total > pagination.limit && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="text-foreground/60">
            Halaman <span className="font-semibold text-foreground">{page}</span> dari {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-surface" />
      ))}
    </div>
  );
}
