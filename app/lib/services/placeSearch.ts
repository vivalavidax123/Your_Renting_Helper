import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  rentScoreCategories,
  type RentScoreCategory,
} from "../categories";
import { getDistanceMeters } from "../scoring";
import type { GooglePlace, NearbyPlace, PlaceSource } from "../types";
import { normalizeStationName, normalizeText } from "../utils";
import { fetchPlacesForBrand, fetchPlacesForTypes } from "./googlePlaces";
import { fetchTransitlandBusStops } from "./transitland";

const transportBusRadiusMeters = 1000;
const transportBusFallbackRadiusMeters = 5000;
const maxTransportBusStops = 4;

let vlineStationNamesPromise: Promise<Set<string>> | null = null;

function getVlineStationNames() {
  vlineStationNamesPromise ??= readFile(
    path.join(process.cwd(), "app", "lib", "vline-stations.txt"),
    "utf8",
  ).then(
    (content) =>
      new Set(
        content
          .split(/\r?\n/)
          .map((line) => normalizeStationName(line))
          .filter(Boolean),
      ),
  );

  return vlineStationNamesPromise;
}

function addPlaceToMap({
  placesById,
  place,
  origin,
  category,
  source,
  radiusMeters = category.radiusMeters,
}: {
  placesById: Map<string, NearbyPlace>;
  place: GooglePlace;
  origin: { latitude: number; longitude: number };
  category: RentScoreCategory;
  source: PlaceSource;
  radiusMeters?: number | null;
}) {
  const placeLatitude = place.location?.latitude;
  const placeLongitude = place.location?.longitude;

  if (
    !place.id ||
    !place.displayName?.text ||
    typeof placeLatitude !== "number" ||
    typeof placeLongitude !== "number"
  ) {
    return;
  }

  if (category.excludedPrimaryTypes?.includes(place.primaryType ?? "")) {
    return;
  }

  if (
    category.id !== "transport" &&
    (typeof place.userRatingCount !== "number" || place.userRatingCount < 30)
  ) {
    return;
  }

  const distanceMeters = getDistanceMeters(origin, {
    latitude: placeLatitude,
    longitude: placeLongitude,
  });

  if (radiusMeters !== null && distanceMeters > radiusMeters) {
    return;
  }

  const existing = placesById.get(place.id);

  if (existing?.source === "brand" && source === "generic") {
    return;
  }

  placesById.set(place.id, {
    id: place.id,
    name: place.displayName.text,
    address: place.formattedAddress ?? "Address unavailable",
    primaryType: place.primaryType ?? "place",
    latitude: placeLatitude,
    longitude: placeLongitude,
    distanceMeters,
    rating: typeof place.rating === "number" ? place.rating : null,
    userRatingCount:
      typeof place.userRatingCount === "number" ? place.userRatingCount : 0,
    source,
  });
}

function sortPlacesByDistance(places: NearbyPlace[]) {
  return [...places].sort((a, b) => a.distanceMeters - b.distanceMeters);
}

function sortPlacesForDisplay(places: NearbyPlace[]) {
  return [...places].sort((a, b) => {
    if (b.userRatingCount !== a.userRatingCount) {
      return b.userRatingCount - a.userRatingCount;
    }

    if ((b.rating ?? 0) !== (a.rating ?? 0)) {
      return (b.rating ?? 0) - (a.rating ?? 0);
    }

    return a.distanceMeters - b.distanceMeters;
  });
}

function collectPlaces({
  googlePlaces,
  origin,
  category,
  source,
  radiusMeters,
}: {
  googlePlaces: GooglePlace[];
  origin: { latitude: number; longitude: number };
  category: RentScoreCategory;
  source: PlaceSource;
  radiusMeters?: number | null;
}) {
  const placesById = new Map<string, NearbyPlace>();

  for (const place of googlePlaces) {
    addPlaceToMap({ placesById, place, origin, category, source, radiusMeters });
  }

  return Array.from(placesById.values());
}

async function fetchPlacesForTransportCategory({
  apiKey,
  category,
  latitude,
  longitude,
}: {
  apiKey: string;
  category: RentScoreCategory;
  latitude: number;
  longitude: number;
}) {
  const origin = { latitude, longitude };
  const transitlandApiKey = process.env.TRANSITLAND_API_KEY;
  const [nearbyBusResults, fallbackBusResults, metroResults, vlineResults] =
    await Promise.all([
      fetchPlacesForTypes({
        apiKey,
        category,
        placeTypes: ["bus_stop", "bus_station"],
        latitude,
        longitude,
        radiusMeters: transportBusRadiusMeters,
      }),
      fetchPlacesForTypes({
        apiKey,
        category,
        placeTypes: ["bus_stop", "bus_station"],
        latitude,
        longitude,
        radiusMeters: transportBusFallbackRadiusMeters,
      }),
      fetchPlacesForTypes({
        apiKey,
        category,
        placeTypes: ["train_station", "subway_station"],
        latitude,
        longitude,
      }),
      fetchPlacesForBrand({
        apiKey,
        category,
        brandTerm: "V/Line station",
        latitude,
        longitude,
      }),
    ]);
  const transitlandBusStops = transitlandApiKey
    ? await fetchTransitlandBusStops({
        apiKey: transitlandApiKey,
        latitude,
        longitude,
        radiusMeters: transportBusRadiusMeters,
      }).catch(() => [])
    : [];
  const transitlandFallbackBusStops =
    transitlandApiKey && transitlandBusStops.length === 0
      ? await fetchTransitlandBusStops({
          apiKey: transitlandApiKey,
          latitude,
          longitude,
          radiusMeters: transportBusFallbackRadiusMeters,
        }).catch(() => [])
      : [];
  const transitlandPreferredBusStops =
    transitlandBusStops.length > 0
      ? transitlandBusStops
      : transitlandFallbackBusStops;

  const nearbyGoogleBusStops = sortPlacesByDistance(
    collectPlaces({
      googlePlaces: nearbyBusResults,
      origin,
      category,
      source: "generic",
      radiusMeters: transportBusRadiusMeters,
    }),
  )
    .slice(0, maxTransportBusStops)
    .map((place) => ({ ...place, primaryType: "bus_stop" }));
  const fallbackGoogleBusStops = sortPlacesByDistance(
    collectPlaces({
      googlePlaces: fallbackBusResults,
      origin,
      category,
      source: "generic",
      radiusMeters: transportBusFallbackRadiusMeters,
    }),
  )
    .slice(0, maxTransportBusStops)
    .map((place) => ({ ...place, primaryType: "bus_stop" }));
  const googleBusStops =
    nearbyGoogleBusStops.length > 0
      ? nearbyGoogleBusStops
      : fallbackGoogleBusStops;
  const busStops =
    transitlandPreferredBusStops.length > 0
      ? transitlandPreferredBusStops
      : googleBusStops;

  const railPlaces = sortPlacesByDistance(
    collectPlaces({
      googlePlaces: metroResults,
      origin,
      category,
      source: "generic",
    }),
  );
  const vlineCandidatePlaces = sortPlacesByDistance([
    ...railPlaces,
    ...collectPlaces({
      googlePlaces: vlineResults,
      origin,
      category,
      source: "brand",
      radiusMeters: null,
    }),
  ]);
  const vlineStationNames = await getVlineStationNames();
  const isVlineStation = (place: NearbyPlace) =>
    vlineStationNames.has(normalizeStationName(place.name));
  const nearestVlineStation = vlineCandidatePlaces.find(isVlineStation);
  const nearestMetroStation = railPlaces.find((place) => !isVlineStation(place));
  const placesById = new Map<string, NearbyPlace>();

  for (const place of [
    ...busStops,
    nearestMetroStation
      ? { ...nearestMetroStation, primaryType: "metro_train_station" }
      : null,
    nearestVlineStation
      ? { ...nearestVlineStation, primaryType: "vline_station" }
      : null,
  ]) {
    if (place) placesById.set(place.id, place);
  }

  return {
    id: category.id,
    label: category.label,
    radiusMeters: category.radiusMeters,
    places: Array.from(placesById.values()),
  };
}

async function fetchPlacesForCategory({
  apiKey,
  category,
  latitude,
  longitude,
}: {
  apiKey: string;
  category: RentScoreCategory;
  latitude: number;
  longitude: number;
}) {
  if (category.id === "transport") {
    return fetchPlacesForTransportCategory({
      apiKey,
      category,
      latitude,
      longitude,
    });
  }

  const origin = { latitude, longitude };
  const placesById = new Map<string, NearbyPlace>();
  const genericPlaces = await fetchPlacesForTypes({
    apiKey,
    category,
    placeTypes: category.placeTypes,
    latitude,
    longitude,
  });

  // Local name matching avoids dozens of paid text-search requests per search.
  for (const place of genericPlaces) {
    const normalizedName = normalizeText(place.displayName?.text ?? "");
    const isBrand = category.brandTerms.some((term) =>
      normalizedName.includes(normalizeText(term)),
    );

    addPlaceToMap({
      placesById,
      place,
      origin,
      category,
      source: isBrand ? "brand" : "generic",
    });
  }

  return {
    id: category.id,
    label: category.label,
    radiusMeters: category.radiusMeters,
    places: sortPlacesForDisplay(Array.from(placesById.values())),
  };
}

function assignPlacesToPrimaryCategories(
  groups: Awaited<ReturnType<typeof fetchPlacesForCategory>>[],
) {
  const assignedPlaceIds = new Set<string>();

  return groups.map((group) => ({
    ...group,
    places: group.places.filter((place) => {
      if (assignedPlaceIds.has(place.id)) return false;

      assignedPlaceIds.add(place.id);
      return true;
    }),
  }));
}

export async function fetchPlaceGroups({
  apiKey,
  latitude,
  longitude,
}: {
  apiKey: string;
  latitude: number;
  longitude: number;
}) {
  const groups = await Promise.all(
    rentScoreCategories.map((category) =>
      fetchPlacesForCategory({ apiKey, category, latitude, longitude }),
    ),
  );

  return assignPlacesToPrimaryCategories(groups);
}
