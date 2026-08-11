import { getCbdTravel } from "@/app/lib/services/cbdTravel";
import { parseCoordinate } from "@/app/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = parseCoordinate(searchParams.get("lat"));
  const longitude = parseCoordinate(searchParams.get("lng"));

  if (
    latitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude === null ||
    longitude < -180 ||
    longitude > 180
  ) {
    return Response.json(
      { ok: false, error: "Latitude and longitude are required." },
      { status: 400 },
    );
  }

  try {
    const travel = await getCbdTravel(latitude, longitude);
    return Response.json(
      { ok: true, travel },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("CBD travel lookup failed:", error);
    return Response.json(
      { ok: false, error: "Could not calculate travel to Melbourne CBD." },
      { status: 502 },
    );
  }
}
