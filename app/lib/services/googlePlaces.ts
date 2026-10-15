import "server-only";

import type { RentScoreCategory } from "@/app/lib/categories";

export type GooglePlace = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
};

type GooglePlacesResponse = {
  places?: GooglePlace[];
  error?: {
    message?: string;
    status?: string;
  };
};

const placeFieldMask =
  "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.rating,places.userRatingCount";

// Both Places endpoints take the same headers and answer in the same shape.
// The timeout stops one slow Google call from holding the whole search.
async function postPlacesSearch(
  endpoint: "searchText" | "searchNearby",
  apiKey: string,
  body: object,
) {
  const response = await fetch(
    `https://places.googleapis.com/v1/places:${endpoint}`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": placeFieldMask,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!response.ok) {
    // Google explains failures in a JSON body, but a proxy error page may
    // not be JSON, so a broken body still produces a readable error.
    const data = (await response
      .json()
      .catch(() => ({}))) as GooglePlacesResponse;
    throw new Error(
      data.error?.message ?? `Places ${endpoint} failed (${response.status}).`,
    );
  }

  const data = (await response.json()) as GooglePlacesResponse;
  return data.places ?? [];
}

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
  return postPlacesSearch("searchText", apiKey, {
    textQuery: brandTerm,
    pageSize: 3,
    locationBias: {
      circle: { center: { latitude, longitude }, radius: radiusMeters },
    },
    regionCode: "AU",
  });
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
  return postPlacesSearch("searchNearby", apiKey, {
    includedTypes: placeTypes,
    // API maximum. Brand chains are tagged by name-matching these results
    // locally (no per-brand text searches), so recall depends on this cap.
    maxResultCount: 20,
    locationRestriction: {
      circle: { center: { latitude, longitude }, radius: radiusMeters },
    },
    regionCode: "AU",
  });
}
