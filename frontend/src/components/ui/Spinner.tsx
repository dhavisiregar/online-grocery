export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-brand ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Full-bleed loading state for route guards (RequireAuth/RequireRole) and
// any page-level fetch that hasn't resolved yet.
export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-sm text-foreground/50">
      <Spinner className="h-6 w-6" />
      Memuat…
    </div>
  );
}
