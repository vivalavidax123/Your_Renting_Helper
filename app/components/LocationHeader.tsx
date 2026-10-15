"use client";
import Link from "next/link";
import { useExplore } from "./ExploreProvider";
import { formatEvidenceDate } from "@/app/lib/utils";

export function LocationEvidenceNotes() {
  const { fetchedAt, resultFromCache } = useExplore();

  return (
    <ul className="list-disc space-y-0.5 pl-4 text-xs leading-5 text-ink-muted">
      {fetchedAt ? (
        <li>
          {resultFromCache ? "Saved evidence" : "Evidence collected"}:{" "}
          {formatEvidenceDate(fetchedAt)}
        </li>
      ) : null}
      <li>A convenience indicator, not a rating of rental quality.</li>
      <li>Distances are direct estimates.</li>
    </ul>
  );
}

function SaveLocationControl() {
  const {
    location,
    locationId,
    overallScore,
    fetchedAt,
    busy,
    canSave,
    saved,
    toggleSaved,
  } = useExplore();

  if (!location || !locationId) return null;

  const favourite = saved.find((item) => item.id === locationId);
  const className =
    "inline-flex min-h-10 items-center justify-center rounded-lg border border-line px-3 text-sm transition hover:bg-hover disabled:opacity-50";

  if (!canSave) {
    return (
      <Link className={className + " text-accent-ink"} href="/login">
        Sign in to save
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      className={className + " text-ink-soft"}
      onClick={() =>
        void toggleSaved(
          favourite ?? {
            ...location,
            id: locationId,
            lastSearchedAt: fetchedAt ?? "",
            savedAt: null,
            overallScore,
          },
        )
      }
    >
      {favourite ? "★ Saved · remove" : "☆ Save location"}
    </button>
  );
}

function SavedError() {
  const { savedError } = useExplore();

  return savedError ? (
    <p role="alert" className="text-sm text-danger-ink">
      {savedError}
    </p>
  ) : null;
}

// Without a title this is the overview header: the address, the overall
// score and the save action together, so every result says what it is about.
// With a title it heads a sub-page: only the way back, the title and the
// address, since saving belongs to the overview.
export function LocationHeader({ title }: { title?: string }) {
  const { location, locationId, scoringParams, overallScore } = useExplore();

  if (!location) return null;

  if (!title) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-ink">
            Location result
          </p>
          <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-ink">
            {location.formattedAddress}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <SaveLocationControl />
          {overallScore !== null ? (
            <div
              role="img"
              aria-label={`Overall score ${overallScore} out of 100`}
              className="flex min-h-16 flex-col items-center justify-center rounded-lg border border-accent bg-accent-soft px-4 py-2 text-accent-ink"
            >
              <p className="whitespace-nowrap leading-none">
                <span className="text-3xl font-bold">{overallScore}</span>
                <span className="ml-1 text-xs font-semibold">/100</span>
              </p>
              <p className="mt-1 text-xs font-medium">Overall score</p>
            </div>
          ) : null}
        </div>
        <div className="w-full empty:hidden">
          <SavedError />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/locations/${locationId}?${scoringParams}`}
        className="text-sm text-accent-ink hover:underline"
      >
        ← Back to overview
      </Link>
      <div>
        <h1 className="break-words text-2xl font-bold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-1 break-words text-sm text-ink-muted">
          {location.formattedAddress}
        </p>
      </div>
    </div>
  );
}
