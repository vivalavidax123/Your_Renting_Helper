"use client";

import { useTheme } from "@/app/components/ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className={`inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${className}`}
    >
      <span className="hidden dark:block">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
        </svg>
      </span>
      <span className="dark:hidden">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M20.4 15.2A8.5 8.5 0 0 1 8.8 3.6 8.5 8.5 0 1 0 20.4 15.2Z" />
        </svg>
      </span>
    </button>
  );
}
