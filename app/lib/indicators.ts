import type { CategoryScore, PlaceGroup } from "./types";
import { formatDistance } from "./utils";

export type Indicator = {
  label: string;
  value: string;
  detail: string;
  detailItems?: { label: string; value: string }[];
};

export const plannedIndicators = [
  "Population density",
  "Median rent / rent trend",
  "Schools / childcare",
  "Safety",
  "Planned development",
];

const majorGroceryPatterns = ["Coles", "Woolworths", "Aldi", "IGA"].map(
  (brand) => ({ brand, pattern: new RegExp(`\\b${brand}\\b`, "i") }),
);

function getCategoryScore(categoryScores: CategoryScore[], id: string) {
  return categoryScores.find((category) => category.id === id);
}

function getScoreLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Moderate";
  return "Limited";
}

function formatOptionalDistance(distanceMeters: number | null) {
  return distanceMeters === null ? "no match" : formatDistance(distanceMeters);
}

function formatWalkTime(distanceMeters: number | null) {
  if (distanceMeters === null) return "n/a";

  return `${Math.max(1, Math.round(distanceMeters / 80))} min`;
}

function getMajorGroceryBrand(placeName: string) {
  return majorGroceryPatterns.find(({ pattern }) => pattern.test(placeName))?.brand;
}

function averageScores(scores: (CategoryScore | undefined)[]) {
  const availableScores = scores.filter(
    (score): score is CategoryScore => Boolean(score),
  );

  if (availableScores.length === 0) return 0;

  const total = availableScores.reduce((sum, score) => sum + score.score, 0);
  return Math.round(total / availableScores.length);
}

function nearestPlace(
  placeGroups: PlaceGroup[],
  groupId: string,
  predicate: (place: PlaceGroup["places"][number]) => boolean = () => true,
) {
  const places = placeGroups
    .find((group) => group.id === groupId)
    ?.places.filter(predicate);

  if (!places || places.length === 0) return null;

  return places.reduce((nearest, place) =>
    place.distanceMeters < nearest.distanceMeters ? place : nearest,
  );
}

export function buildDerivedIndicators(
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
  const nearestBus = nearestPlace(
    placeGroups,
    "transport",
    (place) => place.primaryType === "bus_stop",
  );
  const nearestGrocery = nearestPlace(
    placeGroups,
    "groceries",
    (place) => Boolean(getMajorGroceryBrand(place.name)),
  );
  const nearestShoppingCentre = nearestPlace(placeGroups, "shopping_centres");
  const nearestBusDistance =
    nearestBus?.distanceMeters ?? transport?.closestDistanceMeters ?? null;
  const nearestBusLabel = nearestBus?.transportServices?.[0]?.routeNumber
    ? `Bus ${nearestBus.transportServices[0].routeNumber}`
    : nearestBus?.name ?? "Bus stop";
  const nearestGroceryLabel =
    nearestGrocery?.name ?? "No Coles/Woolworths/Aldi/IGA found";
  const nearestShoppingLabel =
    nearestShoppingCentre?.name ?? "No shopping centre found";
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
        { label: nearestBusLabel, value: formatWalkTime(nearestBusDistance) },
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
        ? `${formatOptionalDistance(transport.closestDistanceMeters)} to closest transport / ${transportDepartures} departures`
        : "Search result needed",
    },
    {
      label: "Amenity density",
      value:
        allPlaces.length >= 60 ? "High" : allPlaces.length >= 30 ? "Medium" : "Light",
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
