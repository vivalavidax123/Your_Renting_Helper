import type { WeightProfile } from "../lib/categories";
import type { CategoryScore, PlacesState } from "../lib/types";

type ScoreBreakdownProps = {
  placesState: PlacesState;
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

function formatDistance(distanceMeters: number | null) {
  if (distanceMeters === null) {
    return "No match";
  }

  return distanceMeters < 1000
    ? `${distanceMeters} m`
    : `${(distanceMeters / 1000).toFixed(1)} km`;
}

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
        <h2 className="text-base font-semibold text-slate-950">Category scores</h2>
        <span
          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
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
        <div className="mb-3 flex w-fit gap-0.5 rounded-md bg-slate-100 p-0.5">
          {profileOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onProfileChange(option.id)}
              className={`rounded px-2.5 py-1 text-xs transition ${
                option.id === profile
                  ? "bg-white font-medium text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {placesState === "idle" ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-600">
          Search for a location to calculate scores from nearby shops,
          shopping centres, services, transport, health, food, and fitness
          options.
        </p>
      ) : null}

      {placesState === "loading" ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-600">
          Loading nearby amenities and calculating scores...
        </p>
      ) : null}

      {placesState === "error" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
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
                  className={`rounded-md bg-slate-50 px-3 py-2.5 ${excluded ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-600">
                      {/* The dot keeps the colour link to the map markers. */}
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${category.colorClass}`}
                      />
                      <span className="truncate">{category.label}</span>
                    </h3>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {excluded ? "not counted" : `${category.weight}%`}
                    </span>
                  </div>
                  <p className="mt-1 text-xl font-semibold text-slate-950">
                    {category.score}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {category.count} nearby · {formatDistance(category.closestDistanceMeters)}
                  </p>
                </article>
              );
            })}
        </div>
      ) : null}
    </div>
  );
}
