import Link from "next/link";
import { MapPinIcon } from "@/app/components/icons";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 text-center shadow-sm">
        <MapPinIcon className="mx-auto size-10 text-ink-faint" />
        <h1 className="mt-3 text-xl font-bold text-ink">
          Location or category not found
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          The link may be old, or the address may have a typo.
        </p>
        <Link
          href="/"
          className="focus-ring mt-5 inline-flex min-h-11 items-center rounded-lg bg-action px-5 text-sm font-semibold text-action-ink transition hover:bg-action-hover"
        >
          Back to search
        </Link>
      </div>
    </main>
  );
}
