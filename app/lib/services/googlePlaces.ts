import type { RentScoreCategory } from "../categories";
import type { GooglePlacesResponse } from "../types";

export async function fetchPlacesForBrand({
  apiKey,
  category,
  brandTerm,
  latitude,
  longitude,
  radiusMeters = category.radiusMeters,
}: {
  apiKey: string;
  category: RentScoreCategory;
  brandTerm: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      textQuery: brandTerm,
      pageSize: 3,
      locationBias: {
        circle: {
          center: {
            latitude,
            longitude,
          },
          radius: radiusMeters,
        },
      },
      regionCode: "AU",
    }),
  });

  const data = (await response.json()) as GooglePlacesResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Places text search failed.");
  }

  return data.places ?? [];
}

export async function fetchPlacesForTypes({
  apiKey,
  category,
  placeTypes,
  latitude,
  longitude,
  radiusMeters = category.radiusMeters,
}: {
  apiKey: string;
  category: RentScoreCategory;
  placeTypes: string[];
  latitude: number;
  longitude: number;
  radiusMeters?: number;
}) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      includedTypes: placeTypes,
      maxResultCount: 10,
      locationRestriction: {
        circle: {
          center: {
            latitude,
            longitude,
          },
          radius: radiusMeters,
        },
      },
      regionCode: "AU",
    }),
  });

  const data = (await response.json()) as GooglePlacesResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Places nearby search failed.");
  }

  return data.places ?? [];
}
