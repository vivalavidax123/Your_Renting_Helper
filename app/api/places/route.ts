import { errorResponse } from "@/app/lib/api";
import { auth } from "@/app/lib/auth";
import { scoreLocation } from "@/app/lib/scoring";
import { fetchNearbyPlacesByCategory } from "@/app/lib/services/placeSearch";
import {
  buildCacheKey,
  findFreshSnapshot,
  recordUserSearch,
  saveSnapshot,
} from "@/app/lib/services/searchStore";
import { parseLatLng } from "@/app/lib/utils";

const maxLabelLength = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const point = parseLatLng(searchParams.get("lat"), searchParams.get("lng"));

  if (!point) {
    return Response.json(
      { ok: false, error: "Latitude and longitude are required." },
      { status: 400 },
    );
  }

  const { latitude, longitude } = point;

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
  // Awaited rather than deferred: the browser reloads its recent-search list
  // as soon as this response lands, so the history row must already exist.
  // Without a location row (saving failed) there is nothing to attach it to.
  const recordSearch = async (locationId: string | null) => {
    if (userId && locationId) {
      await recordUserSearch(userId, locationId).catch((error) => {
        console.error("Recording search history failed:", error);
      });
    }
  };

  try {
    const cachedResult = await findFreshSnapshot(cacheKey);

    if (cachedResult) {
      await recordSearch(cachedResult.locationId);

      return Response.json({
        ok: true,
        locationId: cachedResult.locationId,
        groups: cachedResult.groups,
        cached: true,
        fetchedAt: cachedResult.fetchedAt,
      });
    }
  } catch (error) {
    console.error("Search cache lookup failed:", error);
  }

  try {
    const groups = await fetchNearbyPlacesByCategory({
      apiKey,
      latitude,
      longitude,
    });
    // The browser scores the groups itself for the chosen profile and
    // preset; the stored snapshot keeps the canonical No car / Balanced score.
    const { overallScore, scores } = scoreLocation(groups, "carFree");
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
        scores,
        overallScore,
      });
    } catch (error) {
      console.error("Saving search result failed:", error);
    }

    await recordSearch(locationId);

    return Response.json({
      ok: true,
      locationId,
      groups,
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
