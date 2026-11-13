"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthStatus } from "./AuthStatus";
import { ThemeToggle } from "./ThemeToggle";
import { useExplore } from "./ExploreProvider";
import { LogoIcon } from "./icons";

// Sticky at every width: on phones the result tabs sit right under it, and
// from lg up the full-height map sticks right under it. Full width on result
// pages so the logo lines up with the card column of the split view. The
// background is opaque so page text never shows through underneath.
export function SiteHeader() {
  const { returnToWelcome, placesState } = useExplore();
  // The pre-search home page is a centred two-card layout, so the header
  // matches its width; everywhere else it spans the full split view.
  const welcome =
    usePathname() === "/" &&
    placesState !== "loading" &&
    placesState !== "success";

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-page px-4 sm:px-6 lg:px-8 print:hidden">
      <div
        className={`mx-auto flex h-14 items-center justify-between gap-3 ${welcome ? "max-w-6xl" : "max-w-7xl lg:max-w-none"}`}
      >
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
