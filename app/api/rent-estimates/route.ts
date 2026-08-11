import { auth } from "@/app/lib/auth";
import {
  getRentalEstimate,
  getLatestRentalReport,
  getSuggestedRentalProfile,
  rentalPropertyTypes,
  saveRentalReport,
} from "@/app/lib/services/rentalReports";
import type { RentalPropertyType } from "@/app/lib/types";
import { parseCoordinate } from "@/app/lib/utils";
import { isJsonRecord } from "@/app/lib/api";

function isPropertyType(value: unknown): value is RentalPropertyType {
  return (
    typeof value === "string" &&
    rentalPropertyTypes.includes(value as RentalPropertyType)
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = parseCoordinate(searchParams.get("lat"));
  const longitude = parseCoordinate(searchParams.get("lng"));
  const propertyType = searchParams.get("propertyType") ?? "apartment";
  const bedrooms = Number(searchParams.get("bedrooms") ?? "1");

  if (
    latitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude === null ||
    longitude < -180 ||
    longitude > 180 ||
    !isPropertyType(propertyType) ||
    !Number.isInteger(bedrooms) ||
    bedrooms < 0 ||
    bedrooms > 10
  ) {
    return Response.json(
      { ok: false, error: "Check the location and property details." },
      { status: 400 },
    );
  }

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

  const latitude =
    typeof body.latitude === "number" && Number.isFinite(body.latitude)
      ? body.latitude
      : null;
  const longitude =
    typeof body.longitude === "number" && Number.isFinite(body.longitude)
      ? body.longitude
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
    latitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude === null ||
    longitude < -180 ||
    longitude > 180 ||
    weeklyRent === null ||
    weeklyRent < 50 ||
    weeklyRent > 5000 ||
    bedrooms === null ||
    bedrooms < 0 ||
    bedrooms > 10 ||
    !isPropertyType(body.propertyType) ||
    typeof body.formattedAddress !== "string" ||
    body.formattedAddress.trim().length === 0 ||
    body.formattedAddress.length > 300
  ) {
    return Response.json(
      { ok: false, error: "Check the rent, property details, and location." },
      { status: 400 },
    );
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return Response.json(
      { ok: false, error: "Sign in to contribute rental data." },
      { status: 401 },
    );
  }

  try {
    const ownReport = await saveRentalReport({
      userId: session.user.id,
      formattedAddress: body.formattedAddress.trim(),
      latitude,
      longitude,
      weeklyRent,
      propertyType: body.propertyType,
      bedrooms,
    });
    const estimate = await getRentalEstimate(
      latitude,
      longitude,
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
