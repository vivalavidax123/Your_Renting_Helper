"use client";
import Link from "next/link";
import { AuthStatus } from "./AuthStatus";
import { ThemeToggle } from "./ThemeToggle";
import { useExplore } from "./ExploreProvider";
import { LogoIcon } from "./icons";

// Sticky on phones, where the result tabs sit right under it; static from
// lg up, where the map column is the sticky element instead. The background
// is opaque so page text never shows through while it scrolls underneath.
export function SiteHeader() {
  const { returnToWelcome } = useExplore();

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-page px-4 sm:px-6 lg:static lg:px-8 print:hidden">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3">
        <Link
          href="/"
          onClick={returnToWelcome}
          className="focus-ring flex min-w-0 items-center gap-2 rounded-md text-base font-bold text-ink sm:text-lg"
        >
          <LogoIcon className="size-6 shrink-0 text-accent" />
          <span className="truncate">Your Renting Helper</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
