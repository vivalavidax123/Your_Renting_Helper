import { rentScoreCategories } from "./categories";
import type { PlaceGroup, NearbyPlace } from "./types";

function getProximityScore(
  closestDistanceMeters: number | null,
  radiusMeters: number,
) {
  if (closestDistanceMeters === null) {
    return 0;
  }

  if (closestDistanceMeters <= 500) {
    return 50; // Walkable
  }

  if (closestDistanceMeters <= 2000) {
    return 40; // Short drive
  }

  // Normal drive in Australia (scales from 35 down to 15, never hits 0 just for driving)
  const distancePast2k = closestDistanceMeters - 2000;
  const drivableRange = Math.max(1, radiusMeters - 2000);
  const ratio = Math.min(1, distancePast2k / drivableRange);
  
  return Math.round(35 - 20 * ratio);
}

function getVarietyScore(count: number, categoryId: string) {
  if (count === 0) return 0;

  const highVarietyCategories = ["food", "fitness"];
  const isHighVariety = highVarietyCategories.includes(categoryId);

  if (isHighVariety) {
    // Max 30 points at 5 places (6 points per place)
    return Math.min(30, count * 6);
  } else {
    // Max 30 points at 2 places (15 points per place)
    return Math.min(30, count * 15);
  }
}

function getQualityScore(places: NearbyPlace[]) {
  if (places.length === 0) return 0;

  // Filter places with valid ratings
  const placesWithRatings = places.filter(
    (p) => typeof p.rating === "number" && p.rating !== null,
  );

  // If no places have ratings (e.g., bus stops), default to full quality points
  if (placesWithRatings.length === 0) {
    return 20;
  }

  // Calculate average rating of top 3 places
  const topPlaces = placesWithRatings
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 3);
  const avgRating =
    topPlaces.reduce((sum, p) => sum + (p.rating ?? 0), 0) / topPlaces.length;

  if (avgRating >= 4.5) return 20;
  if (avgRating >= 4.0) return 15;
  return 5;
}

function getExplanation(count: number, closestDistanceMeters: number | null) {
  if (count === 0 || closestDistanceMeters === null) {
    return "No nearby matches were found within the search radius.";
  }

  const distance =
    closestDistanceMeters < 1000
      ? `${closestDistanceMeters} m`
      : `${(closestDistanceMeters / 1000).toFixed(1)} km`;

  return `${count} nearby match${count === 1 ? "" : "es"} found; closest is ${distance} away.`;
}

export function scorePlaceGroups(groups: PlaceGroup[]) {
  const scores = rentScoreCategories.map((category) => {
    const group = groups.find((candidate) => candidate.id === category.id);
    const places = group?.places ?? [];
    const closestDistanceMeters =
      places.length > 0
        ? Math.min(...places.map((place) => place.distanceMeters))
        : null;

    const proximityScore = getProximityScore(
      closestDistanceMeters,
      category.radiusMeters,
    );
    const varietyScore = getVarietyScore(places.length, category.id);
    const qualityScore = getQualityScore(places);

    const score = Math.min(100, proximityScore + varietyScore + qualityScore);

    return {
      id: category.id,
      label: category.label,
      score,
      weight: category.weight,
      colorClass: category.colorClass,
      detail: category.detail,
      count: places.length,
      closestDistanceMeters,
      radiusMeters: category.radiusMeters,
      explanation: getExplanation(places.length, closestDistanceMeters),
    };
  });

  const totalWeight = scores.reduce(
    (sum, category) => sum + category.weight,
    0,
  );
  const weightedScore = scores.reduce(
    (sum, category) => sum + category.score * category.weight,
    0,
  );
  const overallScore =
    totalWeight === 0 ? 0 : Math.round(weightedScore / totalWeight);

  return { overallScore, scores };
}

export function getDistanceMeters(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
) {
  const earthRadiusMeters = 6371000;
  const latA = (origin.latitude * Math.PI) / 180;
  const latB = (destination.latitude * Math.PI) / 180;
  const deltaLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
  const deltaLng = ((destination.longitude - origin.longitude) * Math.PI) / 180;
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(latA) *
      Math.cos(latB) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Math.round(earthRadiusMeters * centralAngle);
}
