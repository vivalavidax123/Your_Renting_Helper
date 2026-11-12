import type { ReactNode } from "react";
import { buildAnalystIndicators } from "@/app/lib/indicators";
import type { CategoryScore, PlaceGroup, RequestState } from "@/app/lib/types";
import { BusIcon, CarIcon, CheckIcon, GridIcon, WalkIcon } from "./icons";

type AdditionalIndicatorsProps = {
  placesState: RequestState;
  categoryScores: CategoryScore[];
  placeGroups: PlaceGroup[];
};

const indicatorIcons: Record<string, ReactNode> = {
  Walkability: <WalkIcon />,
  "Transit access": <BusIcon />,
  "Amenity density": <GridIcon />,
  "Daily convenience": <CheckIcon />,
  "Car reliance": <CarIcon />,
};

// Three-step meters for the indicators whose value is a level, so the
// level is visible without reading the word.
const meterLevels: Record<string, number> = {
  Light: 1,
  Medium: 2,
  High: 3,
  Lower: 1,
  Moderate: 2,
  Higher: 3,
};

export function AdditionalIndicators({
  placesState,
  categoryScores,
  placeGroups,
}: AdditionalIndicatorsProps) {
  if (placesState === "idle" || placesState === "error") {
    return null;
  }

  const derivedIndicators =
    placesState === "success"
      ? buildAnalystIndicators(categoryScores, placeGroups)
      : [];

  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-semibold text-ink">Location indicators</h2>
      <p className="mt-0.5 text-xs text-ink-muted">
        Derived from the current search results.
      </p>

      {placesState === "loading" ? (
        <div
          aria-hidden="true"
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-24 rounded-lg bg-surface-subtle motion-safe:animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {derivedIndicators.map((indicator) => {
            const level = meterLevels[indicator.value];

            return (
              <div
                key={indicator.label}
                className="rounded-lg bg-surface-subtle px-3 py-3"
              >
                <h3 className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                  {indicatorIcons[indicator.label]}
                  {indicator.label}
                </h3>
                <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-ink">
                  {indicator.value}
                  {level ? (
                    <span aria-hidden="true" className="flex gap-0.5">
                      {[1, 2, 3].map((step) => (
                        <span
                          key={step}
                          className={`h-1.5 w-4 rounded-full ${step <= level ? "bg-accent" : "bg-score-track"}`}
                        />
                      ))}
                    </span>
                  ) : null}
                </p>
                {indicator.detailItems ? (
                  <dl className="mt-1 space-y-0.5">
                    {indicator.detailItems.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-baseline justify-between gap-3 text-xs leading-5 text-ink-muted"
                      >
                        <dt className="min-w-0 truncate">{item.label}</dt>
                        <dd className="shrink-0 tabular-nums">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                    {indicator.detail}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
