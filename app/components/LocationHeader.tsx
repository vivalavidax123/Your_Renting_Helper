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

function SaveLocationControl({ compact = false }: { compact?: boolean }) {
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

  if (!canSave) {
    return (
      <Link
        className={
          compact
            ? "inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-line bg-surface-subtle px-2 text-xs text-accent-ink hover:bg-hover"
            : "text-sm text-accent-ink underline"
        }
        href="/login"
      >
        Sign in to save
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      className={`${compact ? "min-h-10 w-full bg-surface-subtle px-2 py-1.5 text-xs" : "min-h-12 px-3 py-2 text-sm"} rounded-lg border border-line text-ink-soft transition hover:bg-hover disabled:opacity-50`}
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
      {favourite
        ? compact
          ? "★ Saved"
          : "★ Saved · remove"
        : compact
          ? "☆ Save"
          : "☆ Save location"}
    </button>
  );
}

export function LocationActions() {
  const { location, savedError } = useExplore();

  if (!location) return null;

  return (
    <div className="flex h-full w-28 flex-col justify-between gap-2">
      <SaveLocationControl compact />
      {savedError ? (
        <p role="alert" className="text-sm text-danger-ink">
          {savedError}
        </p>
      ) : null}
    </div>
  );
}

export function LocationScore() {
  const { location, overallScore } = useExplore();

  if (!location || overallScore === null) return null;

  return (
    <div
      role="img"
      aria-label={`Overall score ${overallScore} out of 100`}
      className="flex h-full min-h-20 w-28 flex-col items-center justify-center rounded-lg border border-accent bg-accent-soft px-3 py-2 text-accent-ink"
    >
      <p className="whitespace-nowrap leading-none">
        <span className="text-3xl font-bold">{overallScore}</span>
        <span className="ml-1 text-xs font-semibold">/100</span>
      </p>
      <p className="mt-1.5 text-xs font-medium">Overall score</p>
    </div>
  );
}

export function LocationHeader({ title }: { title?: string }) {
  const { location, locationId, profile, scoringParams, savedError } =
    useExplore();

  if (!location) return null;

  if (!title) {
    return <h1 className="sr-only">{location.formattedAddress}</h1>;
  }

  const profileLabel = profile === "carOwner" ? "Car owner" : "No car";

  return (
    <div className="space-y-4">
      <Link
        href={`/locations/${locationId}?${scoringParams}`}
        className="text-sm text-accent-ink hover:underline"
      >
        ← Back to overview
      </Link>
      <h1 className="break-words text-2xl font-bold tracking-tight text-ink">
        {title}
      </h1>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="rounded-md bg-surface-raised px-3 py-2 text-xs text-ink-muted">
          Profile:{" "}
          <span className="font-semibold text-ink">{profileLabel}</span>
        </p>
        <SaveLocationControl />
      </div>
      {savedError ? (
        <p role="alert" className="text-sm text-danger-ink">
          {savedError}
        </p>
      ) : null}
      <LocationEvidenceNotes />
    </div>
  );
}
