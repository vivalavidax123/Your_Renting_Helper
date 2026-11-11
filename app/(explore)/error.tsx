"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-1 text-sm text-ink-muted">
          This page hit an unexpected problem. Your saved locations are not
          affected.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="focus-ring min-h-11 rounded-lg bg-action px-5 text-sm font-semibold text-action-ink transition hover:bg-action-hover"
          >
            Try again
          </button>
          <Link
            href="/"
            className="focus-ring inline-flex min-h-11 items-center rounded-lg border border-line-strong px-5 text-sm font-medium text-ink-soft hover:bg-surface-raised"
          >
            Back to search
          </Link>
        </div>
      </div>
    </main>
  );
}
