"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { MoonIcon, SunIcon } from "@/components/ui/Icons";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const label = mounted ? (theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap") : "Ganti tema";

  let icon = <span className="h-4.5 w-4.5" aria-hidden />;
  if (mounted) {
    icon = theme === "dark" ? <SunIcon className="h-4.5 w-4.5" /> : <MoonIcon className="h-4.5 w-4.5" />;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-surface hover:text-foreground"
    >
      {icon}
    </button>
  );
}
