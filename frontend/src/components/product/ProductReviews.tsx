"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { api, getToken, resolveUploadUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { StarRating } from "@/components/ui/StarRating";
import { notifySuccess } from "@/lib/alerts";
import type { Pagination, RatingSummary, Review } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

interface Props {
  productId: number;
  // From the product detail response's can_review field. undefined while
  // the parent's own fetch is still loading.
  canReview?: boolean;
}

export function ProductReviews({ productId, canReview }: Props) {
  const { user } = useAuth();
  const pathname = usePathname();

  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [items, setItems] = useState<Review[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"created_at" | "rating">("created_at");
  const [loading, setLoading] = useState(true);

  function loadSummary() {
    api<RatingSummary>(`/api/products/${productId}/rating-summary`, { auth: false })
      .then(setSummary)
      .catch(() => setSummary(null));
  }

  function loadReviews() {
    setLoading(true);
    api<{ items: Review[]; pagination: Pagination }>(`/api/products/${productId}/reviews`, {
      auth: false,
      query: { page, limit: 5, sort, order: "desc" },
    })
      .then((res) => {
        setItems(res.items);
        setPagination(res.pagination);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // Deferred so the state updates run from an async callback rather than
    // synchronously during the effect itself.
    queueMicrotask(loadSummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    queueMicrotask(loadReviews);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, page, sort]);

  function handleReviewed() {
    setPage(1);
    loadSummary();
    loadReviews();
  }

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;

  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="text-xl font-bold tracking-tight">Ulasan</h2>

      <div className="mt-4 grid gap-6 md:grid-cols-[220px_1fr]">
        <RatingSummaryCard summary={summary} />

        <div className="flex flex-col gap-4">
          {user && canReview === true && <ReviewForm productId={productId} onSubmitted={handleReviewed} />}
          {user && canReview === false && (
            <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-foreground/60">
              Beli produk ini dulu untuk memberi ulasan.
            </p>
          )}
          {!user && (
            <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-foreground/60">
              <Link
                href={`/login?next=${encodeURIComponent(pathname)}`}
                className="font-medium text-brand-dark hover:underline"
              >
                Masuk
              </Link>{" "}
              untuk memberi ulasan.
            </p>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground/70">{pagination?.total ?? 0} ulasan</h3>
            <select
              value={sort}
              onChange={(e) => {
                setPage(1);
                setSort(e.target.value as "created_at" | "rating");
              }}
              className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
            >
              <option value="created_at">Terbaru</option>
              <option value="rating">Rating tertinggi</option>
            </select>
          </div>

          {loading && <ReviewsSkeleton />}
          {!loading && items && items.length === 0 && (
            <p className="text-sm text-foreground/60">Belum ada ulasan untuk produk ini.</p>
          )}
          {!loading && items && items.length > 0 && (
            <div className="flex flex-col gap-3">
              {items.map((review) => (
                <ReviewRow key={review.id} review={review} />
              ))}
            </div>
          )}

          {pagination && pagination.total > pagination.limit && (
            <div className="flex items-center justify-center gap-3 pt-2 text-sm">
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
      </div>
    </section>
  );
}

function RatingSummaryCard({ summary }: { summary: RatingSummary | null }) {
  if (!summary || summary.count === 0) {
    return (
      <div className="flex h-fit flex-col items-center gap-2 rounded-2xl border border-border bg-background p-6 text-center shadow-soft">
        <span className="text-3xl font-bold text-foreground/40">–</span>
        <StarRating value={0} />
        <p className="text-sm text-foreground/60">Belum ada rating</p>
      </div>
    );
  }

  const counts = [1, 2, 3, 4, 5].map((star) => summary.breakdown[String(star)] ?? 0);
  const max = Math.max(1, ...counts);

  return (
    <div className="flex h-fit flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-soft">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-3xl font-bold">{summary.average.toFixed(1)}</span>
        <StarRating value={Math.round(summary.average)} />
        <p className="text-sm text-foreground/60">{summary.count} ulasan</p>
      </div>
      <div className="flex flex-col gap-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = summary.breakdown[String(star)] ?? 0;
          const pct = (count / max) * 100;
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-foreground/60">
              <span className="w-2.5 text-right">{star}</span>
              <span aria-hidden className="text-amber-400">
                ★
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-5 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewForm({ productId, onSubmitted }: { productId: number; onSubmitted: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setMessage(`Format ${file.name} tidak didukung (harus .jpg/.jpeg/.png/.gif/.webp)`);
        return;
      }
    }
    setMessage(null);
    setImages(files);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setMessage("Pilih rating bintang terlebih dahulu");
      return;
    }
    setStatus("loading");
    setMessage(null);

    const form = new FormData();
    form.append("rating", String(rating));
    form.append("comment", comment);
    images.forEach((file) => form.append("images", file));

    try {
      const res = await fetch(`${API_URL}/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Gagal mengirim ulasan");
      notifySuccess("Ulasan Anda telah dikirim");
      setRating(0);
      setComment("");
      setImages([]);
      setStatus("idle");
      onSubmitted();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Gagal mengirim ulasan");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-5 shadow-soft"
    >
      <h3 className="text-sm font-semibold">Tulis Ulasan</h3>
      <StarRating value={rating} onChange={setRating} size="lg" />
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Bagikan pengalaman Anda dengan produk ini…"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
      <input
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        multiple
        onChange={handleFiles}
        className="text-xs text-foreground/60"
      />
      {message && <p className="text-sm text-red-600">{message}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0 disabled:opacity-60"
      >
        {status === "loading" ? "Mengirim…" : "Kirim Ulasan"}
      </button>
    </form>
  );
}

function ReviewRow({ review }: { review: Review }) {
  const avatar = resolveUploadUrl(review.user_profile_photo_url);

  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-sm font-semibold text-foreground/60">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt={review.user_name} className="h-full w-full object-cover" />
          ) : (
            review.user_name.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{review.user_name}</p>
          <p className="text-xs text-foreground/50">{new Date(review.created_at).toLocaleDateString("id-ID")}</p>
        </div>
        <StarRating value={review.rating} size="sm" />
      </div>
      {review.comment && <p className="mt-3 whitespace-pre-line text-sm text-foreground/80">{review.comment}</p>}
      {review.image_urls && review.image_urls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.image_urls.map((url) => {
            const resolved = resolveUploadUrl(url);
            return resolved ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={resolved} alt="" className="h-16 w-16 rounded-lg object-cover" />
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-surface" />
      ))}
    </div>
  );
}
