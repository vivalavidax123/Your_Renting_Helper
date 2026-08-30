import type { WeightProfile } from "@/app/lib/categories";
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
    return Response.json(
      { ok: false, error: "Missing GOOGLE_MAPS_API_KEY in .env.local." },
      { status: 500 },
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
        propertyId: cachedResult.locationId,
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
    let propertyId: string | null = null;

    try {
      propertyId = await saveSnapshot({
        cacheKey,
        locationInput: {
          query: searchParams.get("query") ?? fallbackLabel,
          formattedAddress: searchParams.get("address") ?? fallbackLabel,
          placeId: searchParams.get("placeId") ?? "",
          locationType: searchParams.get("locationType") ?? "UNKNOWN",
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
      propertyId,
      groups,
      scores,
      overallScore,
      cached: false,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not retrieve nearby places.",
      },
      { status: 502 },
    );
  }
}
