export function StatusNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <span aria-hidden className="mt-0.5">
        ⚠️
      </span>
      <span>{message}</span>
    </div>
  );
}

export function PaginationControls({
  page,
  pagination,
  onPage,
}: {
  page: number;
  pagination: { total: number; limit: number };
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-5 text-sm">
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
      >
        Sebelumnya
      </button>
      <span className="text-foreground/60">
        Halaman <span className="font-semibold text-foreground">{page}</span> dari {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
      >
        Berikutnya
      </button>
    </div>
  );
}
