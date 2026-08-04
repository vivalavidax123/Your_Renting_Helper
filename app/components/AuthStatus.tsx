"use client";

import Link from "next/link";
import { authClient } from "@/app/lib/auth-client";

// Slim session line for the page header: a sign-in link when logged out,
// the account email plus sign-out when logged in. useSession is reactive,
// so signing out re-renders this and everything else subscribed to it.
export function AuthStatus() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return null;
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
    <div className="flex items-center gap-3 text-sm">
      <span className="text-ink-muted">{session.user.email}</span>
      <button
        type="button"
        onClick={() => authClient.signOut()}
        className="font-medium text-ink-muted hover:text-accent"
      >
        Sign out
      </button>
    </div>
  );
}
