import { getStoredLocation } from "@/app/lib/services/searchStore";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ propertyId: string }> },
) {
  const { propertyId } = await params;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(propertyId))
    return Response.json(
      { ok: false, error: "Invalid location ID." },
      { status: 400 },
    );
  try {
    const result = await getStoredLocation(propertyId);
    if (!result)
      return Response.json(
        {
          ok: false,
          error: "Location evidence is unavailable. Search this address again.",
        },
        { status: 404 },
      );
    return Response.json(
      { ok: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Stored location lookup failed", error);
    return Response.json(
      {
        ok: false,
        error: "Location evidence could not be loaded. Please retry.",
      },
      { status: 500 },
    );
  }
}
