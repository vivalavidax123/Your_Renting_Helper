import { getTerrainSummary } from "@/app/lib/services/terrain";
import { parseLatLng } from "@/app/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const point = parseLatLng(searchParams.get("lat"), searchParams.get("lng"));

  if (!point) {
    return Response.json(
      { ok: false, error: "Latitude and longitude are required." },
      { status: 400 },
    );
  }

  try {
    const terrain = await getTerrainSummary(point.latitude, point.longitude);
    return Response.json(
      { ok: true, terrain },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Terrain lookup failed:", error);
    return Response.json(
      { ok: false, error: "Could not measure the local terrain." },
      { status: 502 },
    );
  }
}
