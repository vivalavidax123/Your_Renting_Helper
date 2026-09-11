"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/app/lib/auth-client";

// Slim session line for the page header: a sign-in link when logged out,
// the account email plus sign-out when logged in. useSession is reactive,
// so signing out re-renders this and everything else subscribed to it.
export function AuthStatus() {
  const { data: session, isPending } = authClient.useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  if (isPending) {
    return <span role="status" aria-label="Checking sign-in" className="h-5 w-16 rounded bg-surface-raised" />;
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="text-sm font-medium text-ink-muted hover:text-accent"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div ref={accountRef} className="relative text-sm">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex max-w-44 items-center gap-1.5 rounded-md px-2 py-1 text-ink-muted hover:bg-hover hover:text-accent"
        title={session.user.email}
      >
        <span className="truncate">{session.user.email}</span>
      </button>
      {menuOpen ? (
        <div role="menu" className="absolute right-0 z-20 mt-2 min-w-32 rounded-lg border border-line bg-surface p-1 shadow-lg">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              void authClient.signOut();
            }}
            className="w-full rounded-md px-3 py-2 text-left font-medium text-ink-soft hover:bg-hover hover:text-accent"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
