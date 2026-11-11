"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { useExplore } from "./ExploreProvider";
import {
  formatEvidenceDate,
  scoreBand,
  scoreBandClasses,
} from "@/app/lib/utils";
import { LinkIcon, StarIcon } from "./icons";
import { Toast, type ToastMessage } from "./Toast";
import { ScoreRing } from "./ScoreRing";

// The evidence date is in the header beside the score; these are the caveats.
export function LocationEvidenceNotes() {
  return (
    <ul className="list-disc space-y-0.5 pl-4 text-xs leading-5 text-ink-muted">
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

  // Saving needs an account; signed-out visitors learn that on the home page.
  if (!location || !locationId || !canSave) return null;

  const favourite = saved.find((item) => item.id === locationId);

  return (
    <button
      type="button"
      disabled={busy}
      aria-pressed={!!favourite}
      className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink-soft transition hover:bg-surface-raised hover:text-ink disabled:opacity-50"
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
      <StarIcon
        filled={!!favourite}
        className={"size-4 " + (favourite ? "text-amber-500" : "")}
      />
      {favourite ? "Saved" : "Save"}
    </button>
  );
}

// Every result already has its own address (/locations/...), so sharing is
// copying that link. The toast confirms it, since nothing else changes.
function CopyLinkControl() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismiss = useCallback(() => setToast(null), []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast({ message: "Link copied" });
    } catch {
      setToast({ message: "Could not copy. Copy the address bar instead." });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink-soft transition hover:bg-surface-raised hover:text-ink"
      >
        <LinkIcon className="size-4" />
        <span className="max-sm:sr-only">Copy link</span>
      </button>
      <Toast toast={toast} onDismiss={dismiss} />
    </>
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
  const {
    location,
    locationId,
    scoringParams,
    overallScore,
    fetchedAt,
    resultFromCache,
  } = useExplore();

  if (!location) return null;

  if (!title) {
    const band = overallScore === null ? null : scoreBand(overallScore);

    // The ring is the page's focal point; the band word sits beside it so
    // the score never relies on colour alone.
    return (
      <div className="flex flex-wrap items-center gap-4 sm:gap-5">
        <ScoreRing score={overallScore} className="size-22 sm:size-28" />
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-xl font-bold leading-snug tracking-tight text-ink sm:text-2xl">
            {location.formattedAddress}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
            {band ? (
              <>
                <span
                  className={
                    "font-semibold " + scoreBandClasses[band.band].text
                  }
                >
                  {band.label}
                </span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <span>
              {fetchedAt
                ? (resultFromCache ? "Saved evidence from " : "Collected ") +
                  formatEvidenceDate(fetchedAt)
                : "Overall score out of 100"}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Matched as{" "}
            {location.locationType.toLowerCase().replaceAll("_", " ")}
          </p>
        </div>
        <div className="flex gap-2">
          <SaveLocationControl />
          <CopyLinkControl />
        </div>
        <div className="w-full empty:hidden">
          <SavedError />
        </div>
        <p className="sr-only" aria-live="polite">
          {band
            ? `Overall score ${overallScore} out of 100, ${band.label}.`
            : ""}
        </p>
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
