export function StatusNotice({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      {message}
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
    <div className="flex items-center justify-center gap-3 py-4 text-sm">
      <button
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="rounded border border-border px-3 py-1 disabled:opacity-40"
      >
        Sebelumnya
      </button>
      <span>
        Halaman {page} dari {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="rounded border border-border px-3 py-1 disabled:opacity-40"
      >
        Berikutnya
      </button>
    </div>
  );
}
