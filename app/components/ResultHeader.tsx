"use client";

import { useState } from "react";
import type { WeightProfile } from "@/app/lib/categories";
import type { Coverage } from "@/app/lib/indicators";
import type { RequestState } from "@/app/lib/types";
import { scoreBand, scoreBandClasses } from "@/app/lib/utils";
import { CarIcon, LinkIcon, PrinterIcon, StarIcon, WalkIcon } from "./icons";
import { useExplore } from "./ExploreProvider";
import { PresetPicker } from "./ScoringControls";
import { ScoreRing } from "./ScoreRing";

const profileOptions: {
  id: WeightProfile;
  label: string;
  description: string;
  Icon: typeof WalkIcon;
}[] = [
  {
    id: "carFree",
    label: "No car",
    description: "Distance counts strongly: places score best within a walk.",
    Icon: WalkIcon,
  },
  {
    id: "carOwner",
    label: "Car owner",
    description: "More tolerant of distance: farther places still score well.",
    Icon: CarIcon,
  },
];

const coverageStyles: Record<
  Coverage["level"],
  { label: string; dot: string }
> = {
  good: { label: "Good coverage", dot: "bg-score-high" },
  limited: { label: "Limited coverage", dot: "bg-score-mid" },
  sparse: { label: "Sparse data", dot: "bg-score-low" },
};

const actionButtonClass =
  "focus-ring inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink-soft transition hover:bg-surface-raised hover:text-ink";

function formatRetrievedDate(fetchedAt: string) {
  const date = new Date(fetchedAt);

  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

// The location, score and scoring choices come from the shared explore
// state; the page passes only what it derives or owns itself.
type ResultHeaderProps = {
  placesState: RequestState;
  coverage: Coverage | null;
  // Null when this result cannot be saved (signed out, or not in history yet).
  saved: boolean | null;
  onToggleSaved: () => void;
  onShare: () => void;
};

export function ResultHeader({
  placesState,
  coverage,
  saved,
  onToggleSaved,
  onShare,
}: ResultHeaderProps) {
  const {
    location,
    overallScore,
    fetchedAt,
    resultFromCache,
    profile,
    changeProfile,
    busy,
  } = useExplore();
  const [showCoverage, setShowCoverage] = useState(false);

  const hasResult = placesState === "success" && overallScore !== null;
  const band = hasResult ? scoreBand(overallScore) : null;
  const retrievedDate = fetchedAt ? formatRetrievedDate(fetchedAt) : null;
  const activeProfile = profileOptions.find((option) => option.id === profile);

  return (
    <section
      aria-label="Overall score"
      className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-center gap-4 sm:gap-5">
        <ScoreRing
          score={hasResult ? overallScore : null}
          loading={placesState === "loading"}
          className="size-22 sm:size-28"
        />

        <div className="min-w-0 flex-1">
          {placesState === "loading" ? (
            <div className="space-y-2" aria-hidden="true">
              <div className="h-5 w-3/4 rounded bg-surface-raised motion-safe:animate-pulse" />
              <div className="h-3.5 w-1/2 rounded bg-surface-raised motion-safe:animate-pulse" />
            </div>
          ) : hasResult && location && band ? (
            <>
              <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-ink">
                {location.formattedAddress}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
                <span
                  className={`font-semibold ${scoreBandClasses[band.band].text}`}
                >
                  {band.label}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {resultFromCache && retrievedDate
                    ? `Data from ${retrievedDate}`
                    : "Live data just now"}
                </span>
                {coverage ? (
                  <button
                    type="button"
                    aria-expanded={showCoverage}
                    onClick={() => setShowCoverage((value) => !value)}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs font-medium text-ink-soft hover:bg-surface-raised print:hidden"
                  >
                    <span
                      className={`size-1.5 rounded-full ${coverageStyles[coverage.level].dot}`}
                    />
                    {coverageStyles[coverage.level].label}
                  </button>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                Matched as{" "}
                {location.locationType.toLowerCase().replaceAll("_", " ")}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-ink">
                {placesState === "error" ? "No score" : "Search to score"}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                The overall score out of 100 appears here.
              </p>
            </>
          )}
        </div>
      </div>

      {hasResult && coverage && showCoverage ? (
        <p className="mt-3 rounded-lg bg-surface-subtle px-3 py-2 text-xs leading-5 text-ink-soft">
          {coverage.thinCategories.length === 0
            ? "Every category has at least three places, so the score has plenty to work with."
            : `Fewer than three places were found for: ${coverage.thinCategories.join(", ")}. Scores for these categories are less reliable.`}
        </p>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {hasResult && band
          ? `Overall score ${overallScore} out of 100, ${band.label}.`
          : ""}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
        <div
          role="group"
          aria-label="Lifestyle profile"
          className="flex gap-0.5 rounded-lg bg-surface-raised p-1"
        >
          {profileOptions.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={id === profile}
              disabled={busy}
              onClick={() => changeProfile(id)}
              className={`focus-ring inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
                id === profile
                  ? "bg-surface font-medium text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon />
              {label}
            </button>
          ))}
        </div>
        <PresetPicker />

        {hasResult ? (
          <div className="ml-auto flex gap-2">
            {saved !== null ? (
              <button
                type="button"
                aria-pressed={saved}
                onClick={onToggleSaved}
                className={actionButtonClass}
              >
                <StarIcon
                  filled={saved}
                  className={`size-4 ${saved ? "text-amber-500" : ""}`}
                />
                <span className="max-sm:sr-only">
                  {saved ? "Saved" : "Save"}
                </span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onShare}
              className={actionButtonClass}
            >
              <LinkIcon />
              <span className="max-sm:sr-only">Share</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={actionButtonClass}
            >
              <PrinterIcon />
              <span className="sr-only">Print or save as PDF</span>
            </button>
          </div>
        ) : null}
      </div>

      {activeProfile ? (
        <p className="mt-2 text-xs text-ink-muted print:hidden">
          {activeProfile.description}
        </p>
      ) : null}
    </section>
  );
}
