import { auth } from "@/app/lib/auth";
import {
  getRentalEstimate,
  getLatestRentalReport,
  getSuggestedRentalProfile,
  isRentalPropertyType,
  saveRentalReport,
} from "@/app/lib/services/rentalReports";
import { parseLatLng } from "@/app/lib/utils";
import { isJsonRecord } from "@/app/lib/api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const point = parseLatLng(searchParams.get("lat"), searchParams.get("lng"));
  const propertyType = searchParams.get("propertyType") ?? "apartment";
  const bedrooms = Number(searchParams.get("bedrooms") ?? "1");

  if (
    !point ||
    !isRentalPropertyType(propertyType) ||
    !Number.isInteger(bedrooms) ||
    bedrooms < 0 ||
    bedrooms > 10
  ) {
    return Response.json(
      { ok: false, error: "Check the location and property details." },
      { status: 400 },
    );
  }

  const { latitude, longitude } = point;

  try {
    const session = await auth.api
      .getSession({ headers: request.headers })
      .catch(() => null);
    const [estimate, ownReport] = await Promise.all([
      getRentalEstimate(latitude, longitude, propertyType, bedrooms),
      session
        ? getLatestRentalReport(session.user.id, latitude, longitude)
        : Promise.resolve(null),
    ]);
    const suggestedProfile =
      estimate.reportCount === 0 && !ownReport
        ? await getSuggestedRentalProfile(latitude, longitude)
        : null;
    return Response.json({ ok: true, estimate, ownReport, suggestedProfile });
  } catch (error) {
    console.error("Rental estimate lookup failed:", error);
    return Response.json(
      { ok: false, error: "Could not load community rental data." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Request body must be JSON." },
      { status: 400 },
    );
  }

  if (!isJsonRecord(body)) {
    return Response.json(
      { ok: false, error: "Request body must be a JSON object." },
      { status: 400 },
    );
  }

  // JSON numbers only: a string such as "-37.8" is a malformed request here.
  const point =
    typeof body.latitude === "number" && typeof body.longitude === "number"
      ? parseLatLng(body.latitude, body.longitude)
      : null;
  const weeklyRent =
    typeof body.weeklyRent === "number" && Number.isInteger(body.weeklyRent)
      ? body.weeklyRent
      : null;
  const bedrooms =
    typeof body.bedrooms === "number" && Number.isInteger(body.bedrooms)
      ? body.bedrooms
      : null;

  if (
    !point ||
    weeklyRent === null ||
    weeklyRent < 50 ||
    weeklyRent > 5000 ||
    bedrooms === null ||
    bedrooms < 0 ||
    bedrooms > 10 ||
    !isRentalPropertyType(body.propertyType) ||
    typeof body.formattedAddress !== "string" ||
    body.formattedAddress.trim().length === 0 ||
    body.formattedAddress.length > 300
  ) {
    return Response.json(
      { ok: false, error: "Check the rent, property details, and location." },
      { status: 400 },
    );
  }

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return Response.json(
        { ok: false, error: "Sign in to contribute rental data." },
        { status: 401 },
      );
    }

    const ownReport = await saveRentalReport({
      userId: session.user.id,
      formattedAddress: body.formattedAddress.trim(),
      latitude: point.latitude,
      longitude: point.longitude,
      weeklyRent,
      propertyType: body.propertyType,
      bedrooms,
    });
    const estimate = await getRentalEstimate(
      point.latitude,
      point.longitude,
      body.propertyType,
      bedrooms,
    );

    return Response.json({
      ok: true,
      estimate,
      ownReport,
      suggestedProfile: null,
    });
  } catch (error) {
    console.error("Saving rental report failed:", error);
    return Response.json(
      { ok: false, error: "Could not save the rental report." },
      { status: 500 },
    );
  }
}
