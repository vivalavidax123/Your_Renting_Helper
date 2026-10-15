import "server-only";

import type { WeightPreset, WeightProfile } from "@/app/lib/categories";
import { buildAnalystIndicators } from "@/app/lib/indicators";
import { scoreLocation } from "@/app/lib/scoring";
import type { Indicator } from "@/app/lib/indicators";
import type {
  CategoryScore,
  NearbyPlace,
  PlaceGroup,
  TransportService,
} from "@/app/lib/types";
import { getStoredLocation } from "./searchStore";

const maxAmenitiesPerCategory = 5;

type AnalysisScore = Pick<
  CategoryScore,
  | "id"
  | "label"
  | "score"
  | "weight"
  | "count"
  | "closestDistanceMeters"
  | "radiusMeters"
  | "explanation"
>;

type AnalysisAmenity = Pick<
  NearbyPlace,
  "id" | "name" | "primaryType" | "distanceMeters" | "rating"
> & {
  transportServices?: TransportService[];
};

export type LocationAnalysisContext = {
  locationId: string;
  address: string;
  suburb: string | null;
  overallScore: number;
  scoreBreakdown: AnalysisScore[];
  nearbyAmenities: {
    categoryId: string;
    categoryLabel: string;
    count: number;
    nearest: AnalysisAmenity[];
  }[];
  practicalIndicators: Indicator[];
  preferences: {
    mobilityProfile: WeightProfile;
    weightPreset: WeightPreset;
  };
  dataAsOf: string;
};

function toAnalysisAmenity(place: NearbyPlace): AnalysisAmenity {
  return {
    id: place.id,
    name: place.name,
    primaryType: place.primaryType,
    distanceMeters: place.distanceMeters,
    rating: place.rating,
    ...(place.transportServices
      ? { transportServices: place.transportServices }
      : {}),
  };
}

export function assembleLocationAnalysisContext({
  locationId,
  address,
  groups,
  profile,
  preset = "balanced",
  dataAsOf,
}: {
  locationId: string;
  address: string;
  groups: PlaceGroup[];
  profile: WeightProfile;
  preset?: WeightPreset;
  dataAsOf: string;
}): LocationAnalysisContext {
  const { overallScore, scores } = scoreLocation(groups, profile, preset);
  const practicalIndicators = buildAnalystIndicators(scores, groups);

  return {
    locationId,
    address,
    // The geocoder currently stores a formatted address, not a trustworthy
    // locality field. Keep this unavailable rather than guessing from text.
    suburb: null,
    overallScore,
    scoreBreakdown: scores.map(
      ({
        id,
        label,
        score,
        weight,
        count,
        closestDistanceMeters,
        radiusMeters,
        explanation,
      }) => ({
        id,
        label,
        score,
        weight,
        count,
        closestDistanceMeters,
        radiusMeters,
        explanation,
      }),
    ),
    nearbyAmenities: scores.map((score) => {
      const group = groups.find((candidate) => candidate.id === score.id);
      const nearest = [...(group?.places ?? [])]
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, maxAmenitiesPerCategory)
        .map(toAnalysisAmenity);

      return {
        categoryId: score.id,
        categoryLabel: score.label,
        count: group?.places.length ?? 0,
        nearest,
      };
    }),
    practicalIndicators,
    preferences: { mobilityProfile: profile, weightPreset: preset },
    dataAsOf,
  };
}

// Loads a stored location and turns it into the analyst's context. Returns
// null when the location or its place snapshot no longer exists.
export async function loadLocationAnalysisContext(
  locationId: string,
  profile: WeightProfile = "carFree",
  preset: WeightPreset = "balanced",
) {
  const stored = await getStoredLocation(locationId);

  if (!stored) {
    return null;
  }

  return assembleLocationAnalysisContext({
    locationId: stored.locationId,
    address: stored.location.formattedAddress,
    groups: stored.groups,
    profile,
    preset,
    dataAsOf: stored.fetchedAt,
  });
}
