import "server-only";

import type { WeightProfile } from "@/app/lib/categories";
import { scorePlaceGroups } from "@/app/lib/scoring";
import type {
  CategoryScore,
  NearbyPlace,
  PlaceGroup,
  TransportService,
} from "@/app/lib/types";
import { getLocationAnalysisSource } from "./searchStore";

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
  propertyId: string;
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
  preferences: {
    mobilityProfile: WeightProfile;
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
  propertyId,
  address,
  groups,
  profile,
  dataAsOf,
}: {
  propertyId: string;
  address: string;
  groups: PlaceGroup[];
  profile: WeightProfile;
  dataAsOf: string;
}): LocationAnalysisContext {
  const { overallScore, scores } = scorePlaceGroups(groups, profile);

  return {
    propertyId,
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
    preferences: { mobilityProfile: profile },
    dataAsOf,
  };
}

export async function buildLocationAnalysisContext(
  propertyId: string,
  profile: WeightProfile = "carFree",
) {
  const source = await getLocationAnalysisSource(propertyId);

  if (!source) {
    return null;
  }

  return assembleLocationAnalysisContext({
    propertyId: source.id,
    address: source.formattedAddress,
    groups: source.groups,
    profile,
    dataAsOf: source.fetchedAt,
  });
}
