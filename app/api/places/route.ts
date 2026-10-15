import type { WeightProfile } from "@/app/lib/categories";
import { errorResponse } from "@/app/lib/api";
import { auth } from "@/app/lib/auth";
import { scorePlaceGroups } from "@/app/lib/scoring";
import { fetchPlaceGroups } from "@/app/lib/services/placeSearch";
import {
  buildCacheKey,
  findFreshSnapshot,
  recordUserSearch,
  saveSnapshot,
} from "@/app/lib/services/searchStore";
import { parseCoordinate } from "@/app/lib/utils";

const maxLabelLength = 300;

function parseProfile(value: string | null): WeightProfile {
  return value === "carOwner" ? "carOwner" : "carFree";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = parseCoordinate(searchParams.get("lat"));
  const longitude = parseCoordinate(searchParams.get("lng"));
  const profile = parseProfile(searchParams.get("profile"));

  if (latitude === null || longitude === null) {
    return Response.json(
      { ok: false, error: "Latitude and longitude are required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return errorResponse(
      500,
      "Search is temporarily unavailable.",
      "GOOGLE_MAPS_API_KEY is not set.",
    );
  }

  const cacheKey = buildCacheKey(latitude, longitude);
  const session = await auth.api
    .getSession({ headers: request.headers })
    .catch(() => null);
  const userId = session?.user.id ?? null;
  const recordSearch = async () => {
    if (userId) {
      await recordUserSearch(userId, cacheKey).catch((error) => {
        console.error("Recording search history failed:", error);
      });
    }
  };

  try {
    const cachedResult = await findFreshSnapshot(cacheKey);

    if (cachedResult) {
      const { overallScore, scores } = scorePlaceGroups(
        cachedResult.groups,
        profile,
      );

      await recordSearch();

      return Response.json({
        ok: true,
        locationId: cachedResult.locationId,
        groups: cachedResult.groups,
        scores,
        overallScore,
        cached: true,
        fetchedAt: cachedResult.fetchedAt,
      });
    }
  } catch (error) {
    console.error("Search cache lookup failed:", error);
  }

  try {
    const groups = await fetchPlaceGroups({ apiKey, latitude, longitude });
    const { overallScore, scores } = scorePlaceGroups(groups, profile);
    const canonical =
      profile === "carFree"
        ? { overallScore, scores }
        : scorePlaceGroups(groups, "carFree");
    const fallbackLabel = `${latitude}, ${longitude}`;
    // These labels come straight from the caller and are stored on the shared
    // location record, so they are trimmed and capped like other user text.
    const label = (name: string, fallback: string) =>
      searchParams.get(name)?.trim().slice(0, maxLabelLength) || fallback;
    let locationId: string | null = null;

    try {
      locationId = await saveSnapshot({
        cacheKey,
        locationInput: {
          query: label("query", fallbackLabel),
          formattedAddress: label("address", fallbackLabel),
          placeId: label("placeId", ""),
          locationType: label("locationType", "UNKNOWN"),
          latitude,
          longitude,
        },
        groups,
        scores: canonical.scores,
        overallScore: canonical.overallScore,
      });
    } catch (error) {
      console.error("Saving search result failed:", error);
    }

    await recordSearch();

    return Response.json({
      ok: true,
      locationId,
      groups,
      scores,
      overallScore,
      cached: false,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(
      502,
      "Could not retrieve nearby places. Please try again.",
      "Retrieving nearby places failed:",
      error,
    );
  }
}
