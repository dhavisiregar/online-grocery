export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="animate-scale-in rounded-2xl border border-border bg-background p-7 shadow-soft-lg">
        <div className="flex items-center gap-2 text-lg font-bold text-brand-dark">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-soft">
            🛒
          </span>
          GrocerGo
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-foreground/60">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-foreground/50">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition-shadow placeholder:text-foreground/40 focus:border-brand focus:ring-2 focus:ring-brand/25";

export const primaryButtonClass =
  "w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md active:translate-y-0 active:shadow-soft disabled:pointer-events-none disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-soft";

export const secondaryButtonClass =
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-60";

export const outlineBrandButtonClass =
  "rounded-lg border border-brand px-4 py-2 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-light disabled:pointer-events-none disabled:opacity-60";
