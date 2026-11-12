"use client";

import { useTheme } from "./ThemeProvider";
import { MoonIcon, SunIcon } from "./icons";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className={`focus-ring inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink ${className}`}
    >
      <span className="hidden dark:block">
        <SunIcon className="size-[18px]" />
      </span>
      <span className="dark:hidden">
        <MoonIcon className="size-[18px]" />
      </span>
    </button>
  );
}
