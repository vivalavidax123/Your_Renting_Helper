import Link from "next/link";
import { categoryColor } from "@/app/lib/categories";
import type { CategoryScore } from "@/app/lib/types";
import { formatDistance, scoreBand, scoreBandClasses } from "@/app/lib/utils";
import { CategoryTile, ChevronDownIcon } from "./icons";
import { MobilityProfile, PresetPicker } from "./ScoringControls";
export function ScoreBreakdown({
  categoryScores,
  locationId,
  scoringParams,
}: {
  categoryScores: CategoryScore[];
  locationId: string | null;
  scoringParams: string;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Category scores</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Open a category to see the places and evidence behind its score.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MobilityProfile />
          <PresetPicker />
        </div>
      </div>
      {/* Rows keep the fixed order from categories.ts, so changing a preset
          moves the bars but never the rows the eye is following. */}
      <ul className="mt-2 divide-y divide-line-soft">
        {categoryScores.map((category) => {
          const excluded = category.weight === 0;
          const bandClasses = scoreBandClasses[scoreBand(category.score).band];
          const content = (
            <>
              <CategoryTile
                categoryId={category.id}
                color={categoryColor(category.id)}
              />
              <span className="min-w-0">
                <span className="flex items-baseline gap-1.5">
                  <span className="truncate text-sm font-semibold text-ink">
                    {category.label}
                  </span>
                  {excluded ? null : (
                    <span className="shrink-0 text-xs text-ink-muted">
                      {category.weight}%
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-ink-muted">
                  {excluded
                    ? "Not counted in overall"
                    : `${category.count} nearby · ${
                        category.closestDistanceMeters === null
                          ? "no match"
                          : formatDistance(category.closestDistanceMeters)
                      }`}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="h-2 overflow-hidden rounded-full bg-score-track max-sm:col-start-2 max-sm:col-end-5 max-sm:row-start-2"
              >
                <span
                  className={
                    "block h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500 " +
                    (excluded ? "bg-ink-faint" : bandClasses.bg)
                  }
                  style={{ width: category.score + "%" }}
                />
              </span>
              <span
                className={
                  "w-8 text-right text-base font-semibold tabular-nums " +
                  (excluded ? "text-ink-soft" : bandClasses.text)
                }
              >
                {category.score}
              </span>
              <ChevronDownIcon className="size-4 -rotate-90 text-ink-faint" />
            </>
          );
          const rowClass =
            "grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-1 py-2.5 sm:grid-cols-[auto_minmax(0,11rem)_minmax(0,1fr)_auto_auto] " +
            (excluded ? "opacity-60" : "");
          return (
            <li key={category.id}>
              {locationId ? (
                <Link
                  href={
                    "/locations/" +
                    locationId +
                    "/categories/" +
                    category.id +
                    "?" +
                    scoringParams
                  }
                  className={"focus-ring transition hover:bg-hover " + rowClass}
                >
                  {content}
                </Link>
              ) : (
                <div className={rowClass}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
