import type { CategoryScore, PlaceGroup, PlacesState } from "../lib/types";

type AdditionalIndicatorsProps = {
  placesState: PlacesState;
  categoryScores: CategoryScore[];
  placeGroups: PlaceGroup[];
};

type Indicator = {
  label: string;
  value: string;
  detail: string;
  detailItems?: {
    label: string;
    value: string;
  }[];
};

const majorGroceryBrands = ["Coles", "Woolworths", "Aldi", "IGA"];

const plannedIndicators = [
  "Population density",
  "Median rent / rent trend",
  "Schools / childcare",
  "Safety",
  "Planned development",
];

function getCategoryScore(categoryScores: CategoryScore[], id: string) {
  return categoryScores.find((category) => category.id === id);
}

function getScoreLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Moderate";
  return "Limited";
}

function formatDistance(distanceMeters: number | null) {
  if (distanceMeters === null) return "no match";

  return distanceMeters < 1000
    ? `${distanceMeters} m`
    : `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatWalkTime(distanceMeters: number | null) {
  if (distanceMeters === null) return "n/a";

  const minutes = Math.max(1, Math.round(distanceMeters / 80));
  return `${minutes} min`;
}

function getMajorGroceryBrand(placeName: string) {
  const normalizedName = placeName.toLowerCase();

  return majorGroceryBrands.find((brand) => {
    const normalizedBrand = brand.toLowerCase();
    return new RegExp(`\\b${normalizedBrand}\\b`, "i").test(normalizedName);
  });
}

function averageScores(scores: (CategoryScore | undefined)[]) {
  const availableScores = scores.filter(
    (score): score is CategoryScore => Boolean(score),
  );

  if (availableScores.length === 0) return 0;

  const total = availableScores.reduce((sum, score) => sum + score.score, 0);
  return Math.round(total / availableScores.length);
}

function buildDerivedIndicators(
  categoryScores: CategoryScore[],
  placeGroups: PlaceGroup[],
): Indicator[] {
  const groceries = getCategoryScore(categoryScores, "groceries");
  const food = getCategoryScore(categoryScores, "food");
  const health = getCategoryScore(categoryScores, "health");
  const services = getCategoryScore(categoryScores, "services");
  const shopping = getCategoryScore(categoryScores, "shopping_centres");
  const transport = getCategoryScore(categoryScores, "transport");
  const fuel = getCategoryScore(categoryScores, "fuel");

  const allPlaces = placeGroups.flatMap((group) => group.places);
  const nearestBus =
    placeGroups
      .find((group) => group.id === "transport")
      ?.places.filter((place) => place.primaryType === "bus_stop")
      .sort((a, b) => a.distanceMeters - b.distanceMeters)[0] ?? null;
  const nearestGrocery =
    placeGroups
      .find((group) => group.id === "groceries")
      ?.places.filter((place) => getMajorGroceryBrand(place.name))
      .sort((a, b) => a.distanceMeters - b.distanceMeters)[0] ?? null;
  const nearestShoppingCentre =
    placeGroups
      .find((group) => group.id === "shopping_centres")
      ?.places.sort((a, b) => a.distanceMeters - b.distanceMeters)[0] ?? null;
  const nearestBusDistance =
    nearestBus?.distanceMeters ?? transport?.closestDistanceMeters ?? null;
  const nearestBusLabel =
    nearestBus?.transportServices?.[0]?.routeNumber
      ? `Bus ${nearestBus.transportServices[0].routeNumber}`
      : nearestBus?.name ?? "Bus stop";
  const nearestGroceryLabel = nearestGrocery?.name ?? "No Coles/Woolworths/Aldi/IGA found";
  const nearestShoppingLabel = nearestShoppingCentre?.name ?? "No shopping centre found";
  const walkDistances = [
    nearestBusDistance,
    nearestGrocery?.distanceMeters ?? groceries?.closestDistanceMeters ?? null,
    nearestShoppingCentre?.distanceMeters ?? shopping?.closestDistanceMeters ?? null,
  ];
  const availableWalkDistances = walkDistances.filter(
    (distance): distance is number => distance !== null,
  );
  const averageWalkMinutes =
    availableWalkDistances.length > 0
      ? Math.round(
          availableWalkDistances.reduce((sum, distance) => sum + distance, 0) /
            availableWalkDistances.length /
            80,
        )
      : 0;
  const transportDepartures =
    placeGroups
      .find((group) => group.id === "transport")
      ?.places.reduce(
        (sum, place) => sum + (place.transportServices?.length ?? 0),
        0,
      ) ?? 0;
  const convenienceScore = averageScores([
    groceries,
    food,
    health,
    services,
    shopping,
  ]);
  const driveOutsideWalk = [groceries, health, services, shopping].filter(
    (score) =>
      score?.closestDistanceMeters === null ||
      score?.closestDistanceMeters === undefined ||
      score.closestDistanceMeters > 1200,
  ).length;
  const carRelianceScore = Math.max(
    0,
    Math.min(100, 85 - driveOutsideWalk * 16 + (fuel?.score ?? 0) * 0.15),
  );

  return [
    {
      label: "Walkability",
      value:
        availableWalkDistances.length > 0
          ? `${Math.max(1, averageWalkMinutes)} min avg`
          : "Pending",
      detail: "Estimated walk time to key everyday destinations",
      detailItems: [
        {
          label: nearestBusLabel,
          value: formatWalkTime(nearestBusDistance),
        },
        {
          label: nearestGroceryLabel,
          value: formatWalkTime(nearestGrocery?.distanceMeters ?? null),
        },
        {
          label: nearestShoppingLabel,
          value: formatWalkTime(nearestShoppingCentre?.distanceMeters ?? null),
        },
      ],
    },
    {
      label: "Transit access",
      value: transport ? getScoreLabel(transport.score) : "Pending",
      detail: transport
        ? `${formatDistance(transport.closestDistanceMeters)} to closest transport / ${transportDepartures} departures`
        : "Search result needed",
    },
    {
      label: "Amenity density",
      value: allPlaces.length >= 60 ? "High" : allPlaces.length >= 30 ? "Medium" : "Light",
      detail: `${allPlaces.length} amenities found across ${placeGroups.length} categories`,
    },
    {
      label: "Daily convenience",
      value: getScoreLabel(convenienceScore),
      detail: "Groceries, food, health, services, and shopping coverage",
    },
    {
      label: "Car reliance",
      value:
        carRelianceScore >= 75
          ? "Lower"
          : carRelianceScore >= 55
            ? "Moderate"
            : "Higher",
      detail: `${driveOutsideWalk} core categories likely need a longer walk or drive`,
    },
  ];
}

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
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">
        Additional indicators
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Derived from the current search results.
      </p>

      {placesState === "idle" ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-600">
          Search for a location to derive walkability, transit, amenity density,
          convenience, and car reliance.
        </p>
      ) : null}

      {placesState === "loading" ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-600">
          Updating location indicators...
        </p>
      ) : null}

      {placesState === "success" ? (
        <div className="mt-2 divide-y divide-slate-100">
          {derivedIndicators.map((indicator) => (
            <div key={indicator.label} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-medium text-slate-900">
                  {indicator.label}
                </h3>
                <span className="shrink-0 text-sm text-slate-600">
                  {indicator.value}
                </span>
              </div>
              {indicator.detailItems ? (
                <div className="mt-1 space-y-1">
                  {indicator.detailItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-baseline justify-between gap-3 text-xs leading-5 text-slate-500"
                    >
                      <span className="min-w-0 break-words">{item.label}</span>
                      <span className="shrink-0">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  {indicator.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 border-t border-slate-200 pt-3">
        <p className="text-xs leading-5 text-slate-400">
          Planned: {plannedIndicators.join(" · ").toLowerCase()}
        </p>
      </div>
    </div>
  );
}
