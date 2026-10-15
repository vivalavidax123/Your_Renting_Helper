import Link from "next/link";
import type { CategoryScore } from "@/app/lib/types";
import { formatDistance } from "@/app/lib/utils";
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
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {categoryScores.map((category) => {
          const content = (
            <>
              <div className="flex items-center gap-1.5">
                <span
                  className={
                    "size-2 shrink-0 rounded-full " + category.colorClass
                  }
                />
                <h3 className="text-xs font-medium text-ink-soft">
                  {category.label}
                </h3>
              </div>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {category.score}
                <span className="text-xs font-normal text-ink-muted">
                  {" "}
                  /100
                </span>
              </p>
              <div
                aria-hidden="true"
                className="mt-2 h-1 overflow-hidden rounded-full bg-line"
              >
                <div
                  className={"h-full rounded-full " + category.colorClass}
                  style={{ width: category.score + "%" }}
                />
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {category.count} nearby ·{" "}
                {category.closestDistanceMeters === null
                  ? "No match"
                  : formatDistance(category.closestDistanceMeters)}
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">
                {category.weight
                  ? category.weight + "% of overall"
                  : "Not counted in overall"}
              </p>
            </>
          );
          return locationId ? (
            <Link
              key={category.id}
              href={
                "/locations/" +
                locationId +
                "/categories/" +
                category.id +
                "?" +
                scoringParams
              }
              aria-label={
                category.label +
                ", " +
                category.score +
                " out of 100, view details"
              }
              className="rounded-lg border border-line bg-surface-subtle p-3 transition hover:border-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {content}
            </Link>
          ) : (
            <article
              key={category.id}
              className="rounded-lg border border-line bg-surface-subtle p-3"
            >
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
}
