import {
  buildDerivedIndicators,
  plannedIndicators,
} from "../lib/indicators";
import type { CategoryScore, PlaceGroup, RequestState } from "../lib/types";

type AdditionalIndicatorsProps = {
  placesState: RequestState;
  categoryScores: CategoryScore[];
  placeGroups: PlaceGroup[];
};

export function AdditionalIndicators({
  placesState,
  categoryScores,
  placeGroups,
}: AdditionalIndicatorsProps) {
  const derivedIndicators =
    placesState === "success"
      ? buildDerivedIndicators(categoryScores, placeGroups)
      : [];

  return (
    <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">
        Additional indicators
      </h2>
      <p className="mt-1 text-xs text-ink-muted">
        Derived from the current search results.
      </p>

      {placesState === "idle" ? (
        <p className="mt-4 rounded-lg border border-line bg-surface-subtle px-3 py-2.5 text-sm leading-6 text-ink-soft">
          Search for a location to derive walkability, transit, amenity density,
          convenience, and car reliance.
        </p>
      ) : null}

      {placesState === "loading" ? (
        <p className="mt-4 rounded-lg border border-line bg-surface-subtle px-3 py-2.5 text-sm font-medium text-ink-soft">
          Updating location indicators...
        </p>
      ) : null}

      {placesState === "success" ? (
        <div className="mt-2 divide-y divide-line-soft">
          {derivedIndicators.map((indicator) => (
            <div key={indicator.label} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-medium text-ink">
                  {indicator.label}
                </h3>
                <span className="shrink-0 text-sm text-ink-soft">
                  {indicator.value}
                </span>
              </div>
              {indicator.detailItems ? (
                <div className="mt-1 space-y-1">
                  {indicator.detailItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-baseline justify-between gap-3 text-xs leading-5 text-ink-muted"
                    >
                      <span className="min-w-0 break-words">{item.label}</span>
                      <span className="shrink-0">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                  {indicator.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 border-t border-line pt-3">
        <p className="text-xs leading-5 text-ink-faint">
          Planned: {plannedIndicators.join(" · ").toLowerCase()}
        </p>
      </div>
    </div>
  );
}
