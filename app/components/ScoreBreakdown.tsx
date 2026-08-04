import type { WeightProfile } from "../lib/categories";
import type { CategoryScore, RequestState } from "../lib/types";
import { formatDistance } from "../lib/utils";

type ScoreBreakdownProps = {
  placesState: RequestState;
  categoryScores: CategoryScore[];
  placesError: string;
  resultFromCache: boolean;
  profile: WeightProfile;
  onProfileChange: (profile: WeightProfile) => void;
};

const profileOptions: { id: WeightProfile; label: string }[] = [
  { id: "carFree", label: "No car" },
  { id: "carOwner", label: "Car owner" },
];

const formatOptionalDistance = (distanceMeters: number | null) =>
  distanceMeters === null ? "No match" : formatDistance(distanceMeters);

export function ScoreBreakdown({
  placesState,
  categoryScores,
  placesError,
  resultFromCache,
  profile,
  onProfileChange,
}: ScoreBreakdownProps) {
  const badgeLabel =
    placesState !== "success"
      ? "Search required"
      : resultFromCache
        ? "Cached result"
        : "Live nearby data";

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Category scores</h2>
        <span
          className="rounded-full bg-surface-raised px-2.5 py-1 text-xs font-medium text-ink-soft"
          title={
            resultFromCache
              ? "This location was scored within the last 24 hours, so the saved result was reused without new map lookups."
              : undefined
          }
        >
          {badgeLabel}
        </span>
      </div>

      {placesState === "success" ? (
        <div className="mb-3 flex w-fit gap-0.5 rounded-md bg-surface-raised p-0.5">
          {profileOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onProfileChange(option.id)}
              className={`rounded px-2.5 py-1 text-xs transition ${
                option.id === profile
                  ? "bg-surface font-medium text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {placesState === "idle" ? (
        <p className="rounded-lg border border-line bg-surface-subtle px-3 py-2.5 text-sm leading-6 text-ink-soft">
          Search for a location to calculate scores from nearby shops,
          shopping centres, services, transport, health, food, and fitness
          options.
        </p>
      ) : null}

      {placesState === "loading" ? (
        <p className="rounded-lg border border-line bg-surface-subtle px-3 py-2.5 text-sm font-medium text-ink-soft">
          Loading nearby amenities and calculating scores...
        </p>
      ) : null}

      {placesState === "error" ? (
        <p className="rounded-lg border border-danger-line bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger-ink">
          {placesError}
        </p>
      ) : null}

      {placesState === "success" ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {/* Sorted by weight so switching profiles visibly reorders the
              cards; zero-weight categories dim out entirely. */}
          {[...categoryScores]
            .sort((a, b) => b.weight - a.weight)
            .map((category) => {
              const excluded = category.weight === 0;

              return (
                <article
                  key={category.id}
                  className={`rounded-md bg-surface-subtle px-3 py-2.5 ${excluded ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-ink-soft">
                      {/* The dot keeps the colour link to the map markers. */}
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${category.colorClass}`}
                      />
                      <span className="truncate">{category.label}</span>
                    </h3>
                    <span className="shrink-0 text-[11px] text-ink-faint">
                      {excluded ? "not counted" : `${category.weight}%`}
                    </span>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-ink">
                    {category.score}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {category.count} nearby · {formatOptionalDistance(category.closestDistanceMeters)}
                  </p>
                </article>
              );
            })}
        </div>
      ) : null}
    </div>
  );
}
