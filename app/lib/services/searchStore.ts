import { prisma } from "@/app/lib/db";
import type { CategoryScore, PlaceGroup, RecentSearch } from "@/app/lib/types";

// Cached score results are reused for this long before Google is queried
// again. Nearby amenities change slowly, so a day-old result is still useful.
const cacheTtlMs = 24 * 60 * 60 * 1000;

export type SearchLocationInput = {
  query: string;
  formattedAddress: string;
  placeId: string;
  locationType: string;
  latitude: number;
  longitude: number;
};

export type CachedSearchResult = {
  groups: PlaceGroup[];
  scores: CategoryScore[];
  overallScore: number;
  fetchedAt: string;
};

// Coordinates rounded to 4 decimal places (~11 metres) so searches of the
// same address map to the same cache row even if geocoding jitters slightly.
export function buildCacheKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

export async function findFreshSnapshot(
  cacheKey: string,
): Promise<CachedSearchResult | null> {
  const location = await prisma.searchLocation.findUnique({
    where: { cacheKey },
    include: { snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const snapshot = location?.snapshots[0];

  if (!location || !snapshot) {
    return null;
  }

  if (Date.now() - snapshot.createdAt.getTime() > cacheTtlMs) {
    return null;
  }

  await prisma.searchLocation.update({
    where: { id: location.id },
    data: { lastSearchedAt: new Date() },
  });

  return {
    groups: JSON.parse(snapshot.groupsJson) as PlaceGroup[],
    scores: JSON.parse(snapshot.scoresJson) as CategoryScore[],
    overallScore: snapshot.overallScore,
    fetchedAt: snapshot.createdAt.toISOString(),
  };
}

export async function saveSnapshot({
  cacheKey,
  locationInput,
  groups,
  scores,
  overallScore,
}: {
  cacheKey: string;
  locationInput: SearchLocationInput;
  groups: PlaceGroup[];
  scores: CategoryScore[];
  overallScore: number;
}) {
  const location = await prisma.searchLocation.upsert({
    where: { cacheKey },
    update: {
      lastSearchedAt: new Date(),
      query: locationInput.query,
      formattedAddress: locationInput.formattedAddress,
      placeId: locationInput.placeId,
      locationType: locationInput.locationType,
    },
    create: { cacheKey, ...locationInput },
  });

  await prisma.scoreSnapshot.create({
    data: {
      locationId: location.id,
      overallScore,
      scoresJson: JSON.stringify(scores),
      groupsJson: JSON.stringify(groups),
    },
  });
}

export async function listRecentSearches(limit = 8): Promise<RecentSearch[]> {
  const locations = await prisma.searchLocation.findMany({
    orderBy: { lastSearchedAt: "desc" },
    take: limit,
    include: { snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return locations
    .filter((location) => location.snapshots.length > 0)
    .map((location) => ({
      id: location.id,
      query: location.query,
      formattedAddress: location.formattedAddress,
      placeId: location.placeId,
      locationType: location.locationType,
      latitude: location.latitude,
      longitude: location.longitude,
      lastSearchedAt: location.lastSearchedAt.toISOString(),
      overallScore: location.snapshots[0].overallScore,
    }));
}
