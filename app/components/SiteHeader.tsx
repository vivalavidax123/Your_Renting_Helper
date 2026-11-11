"use client";
import Link from "next/link";
import { AuthStatus } from "./AuthStatus";
import { ThemeToggle } from "./ThemeToggle";
import { useExplore } from "./ExploreProvider";
import { LogoIcon } from "./icons";

// Sticky on phones so the account and Compare stay in reach while scrolling;
// static from lg up, where the page is short enough to see the header.
export function SiteHeader() {
  const { returnToWelcome } = useExplore();

  return (
    <header className="sticky top-0 z-40 mb-4 border-b border-line-soft bg-page/85 px-4 backdrop-blur sm:px-6 lg:static lg:px-8 print:hidden">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3">
        <Link
          href="/"
          onClick={returnToWelcome}
          className="focus-ring flex min-w-0 items-center gap-2 rounded-md text-base font-bold tracking-tight text-ink sm:text-lg"
        >
          <LogoIcon className="size-6 shrink-0 text-accent" />
          <span className="truncate">Your Renting Helper</span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="flex shrink-0 items-center gap-2 sm:gap-3"
        >
          <Link
            href="/compare"
            className="focus-ring rounded-md px-1 text-sm text-ink-muted hover:text-accent"
          >
            Compare
          </Link>
          <ThemeToggle />
          <AuthStatus />
        </nav>
      </div>
    </header>
  );
}
