"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/app/lib/authClient";
import { useLoginHref } from "@/app/hooks/useLoginHref";

// Session control for the page header: a sign-in button when logged out,
// an avatar with the account email and sign-out when logged in. useSession is reactive,
// so signing out re-renders this and everything else subscribed to it.
export function AuthStatus() {
  const { data: session, isPending } = authClient.useSession();
  const loginHref = useLoginHref();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node))
        setMenuOpen(false);
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
    return (
      <span
        role="status"
        aria-label="Checking sign-in"
        className="size-9 rounded-full bg-surface-raised"
      />
    );
  }

  if (!session) {
    return (
      <Link
        href={loginHref}
        className="focus-ring inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink-soft transition hover:bg-surface-raised hover:text-ink"
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
        aria-label="Account menu"
        onClick={() => setMenuOpen((open) => !open)}
        className="focus-ring flex size-9 items-center justify-center rounded-full border border-accent-line bg-accent-soft text-sm font-semibold text-accent-ink"
      >
        {(session.user.name || session.user.email).charAt(0).toUpperCase()}
      </button>
      {menuOpen ? (
        // A plain disclosure, not role="menu": a menu promises arrow-key
        // navigation, which one Sign out button does not need.
        <div className="absolute right-0 z-50 mt-2 w-60 rounded-lg border border-line bg-surface p-1.5 shadow-lg">
          <p className="truncate px-3 py-2 text-xs text-ink-muted">
            {session.user.email}
          </p>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              void authClient.signOut();
            }}
            className="focus-ring w-full rounded-md px-3 py-2 text-left text-ink-soft hover:bg-hover hover:text-ink"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
