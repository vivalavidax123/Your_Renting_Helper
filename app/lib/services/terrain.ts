import "server-only";

import { buildTerrainSamplePoints, summariseTerrain } from "@/app/lib/terrain";
import type { TerrainSummary } from "@/app/lib/types";

type GoogleElevationResponse = {
  status?: string;
  error_message?: string;
  results?: Array<{ elevation?: number }>;
};

// One Elevation API request covers every sample point (81 of them), well
// under Google's 512-location limit per request.
export async function getTerrainSummary(
  latitude: number,
  longitude: number,
): Promise<TerrainSummary> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured.");
  }

  const points = buildTerrainSamplePoints({ latitude, longitude });
  const url = new URL("https://maps.googleapis.com/maps/api/elevation/json");
  url.searchParams.set(
    "locations",
    points
      .map((point) =>
        [point.latitude.toFixed(5), point.longitude.toFixed(5)].join(","),
      )
      .join("|"),
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const data = (await response.json()) as GoogleElevationResponse;

  // The Elevation API reports most failures as HTTP 200 with a non-OK status.
  if (!response.ok || data.status !== "OK") {
    throw new Error(
      data.error_message ?? `Google Elevation request failed: ${data.status}`,
    );
  }

  const elevations = (data.results ?? []).map((result) => result.elevation);

  if (
    elevations.length !== points.length ||
    elevations.some((value) => typeof value !== "number")
  ) {
    throw new Error("Google Elevation returned incomplete results.");
  }

  return summariseTerrain(elevations as number[]);
}
