import { getCbdTravel } from "@/app/lib/services/cbdTravel";
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
    const travel = await getCbdTravel(point.latitude, point.longitude);
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
