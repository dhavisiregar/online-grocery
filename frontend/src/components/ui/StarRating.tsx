"use client";

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
};

// Reusable 1-5 star control. Pass onChange for an interactive input (the
// review form); omit it for a read-only display (product card, rating
// summary) — rendered as plain spans rather than buttons in that case, so
// it's safe to nest inside a Link (a <button> can't legally nest in an <a>).
export function StarRating({ value, onChange, size = "md" }: Props) {
  const stars = [1, 2, 3, 4, 5];
  const sizeClass = SIZE_CLASS[size];

  if (!onChange) {
    return (
      <div className={`flex items-center gap-0.5 ${sizeClass}`} aria-label={`${value} dari 5 bintang`}>
        {stars.map((star) => (
          <span key={star} aria-hidden className={value >= star ? "text-amber-400" : "text-foreground/20"}>
            ★
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-0.5 ${sizeClass}`} role="radiogroup" aria-label="Rating">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} bintang`}
          onClick={() => onChange(star)}
          className="cursor-pointer leading-none transition-transform hover:scale-110"
        >
          <span aria-hidden className={value >= star ? "text-amber-400" : "text-foreground/20"}>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}
