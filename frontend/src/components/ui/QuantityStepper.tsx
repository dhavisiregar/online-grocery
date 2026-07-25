"use client";

export function QuantityStepper({
  qty,
  max,
  onChange,
}: {
  qty: number;
  max: number;
  onChange: (n: number) => void;
}) {
  function clamp(n: number) {
    if (!Number.isFinite(n)) return 1;
    return Math.min(max, Math.max(1, Math.trunc(n)));
  }

  return (
    <div className="inline-flex w-fit items-center self-start rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => onChange(clamp(qty - 1))}
        className="px-3 py-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
        aria-label="Kurangi jumlah"
      >
        −
      </button>
      <input
        type="number"
        min={1}
        max={max}
        value={qty}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="w-12 border-x border-border bg-transparent py-2 text-center text-sm font-medium outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Jumlah"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(qty + 1))}
        className="px-3 py-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
        aria-label="Tambah jumlah"
      >
        +
      </button>
    </div>
  );
}
