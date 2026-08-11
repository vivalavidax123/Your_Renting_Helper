import { getDistanceMeters } from "@/app/lib/scoring";
import type { CbdTravel } from "@/app/lib/types";

const melbourneCbd = {
  // Melbourne Town Hall is a stable, recognisable centre point for the CBD.
  latitude: -37.8148,
  longitude: 144.9632,
};

type GeoapifyRoutingResponse = {
  results?: Array<{
    time?: number;
  }>;
  error?: string;
  message?: string;
};

type GoogleRoutesResponse = {
  routes?: Array<{
    duration?: string;
  }>;
  error?: { message?: string };
};

function durationToNearestFiveMinutes(value: string | undefined) {
  const seconds = value?.match(/^([0-9.]+)s$/)?.[1];

  if (!seconds) {
    return null;
  }

  return Math.max(5, Math.round(Number(seconds) / (5 * 60)) * 5);
}

function secondsToNearestFiveMinutes(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.max(5, Math.round(value / (5 * 60)) * 5);
}

const melbourneTimeZone = "Australia/Melbourne";

// Tuesday avoids the different service patterns commonly seen on weekends.
// Work in Melbourne calendar parts first, then convert that local 08:00 to
// UTC so daylight-saving time is handled correctly by the Routes request.
export function getNextTypicalTransitDeparture(now = new Date()) {
  const localParts = new Intl.DateTimeFormat("en-AU", {
    timeZone: melbourneTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    localParts.find((entry) => entry.type === type)?.value ?? "";
  const weekdayIndex: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const currentWeekday = weekdayIndex[part("weekday")];
  const currentMinutes = Number(part("hour")) * 60 + Number(part("minute"));
  let daysAhead = (2 - currentWeekday + 7) % 7;

  if (daysAhead === 0 && currentMinutes >= 8 * 60) {
    daysAhead = 7;
  }

  const localEightAsUtc = Date.UTC(
    Number(part("year")),
    Number(part("month")) - 1,
    Number(part("day")) + daysAhead,
    8,
  );
  const offsetLabel = new Intl.DateTimeFormat("en-AU", {
    timeZone: melbourneTimeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(new Date(localEightAsUtc))
    .find((entry) => entry.type === "timeZoneName")?.value;
  const offset = offsetLabel?.match(/^GMT([+-])(\d{2}):(\d{2})$/);

  if (!offset) {
    throw new Error("Could not determine the Melbourne time-zone offset.");
  }

  const offsetMinutes =
    (offset[1] === "+" ? 1 : -1) *
    (Number(offset[2]) * 60 + Number(offset[3]));

  return new Date(localEightAsUtc - offsetMinutes * 60 * 1000);
}

async function fetchDrivingMinutes({
  apiKey,
  latitude,
  longitude,
}: {
  apiKey: string;
  latitude: number;
  longitude: number;
}) {
  const url = new URL("https://api.geoapify.com/v1/routing");
  url.searchParams.set(
    "waypoints",
    `${latitude},${longitude}|${melbourneCbd.latitude},${melbourneCbd.longitude}`,
  );
  url.searchParams.set("mode", "drive");
  url.searchParams.set("traffic", "free_flow");
  url.searchParams.set("format", "json");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const data = (await response.json()) as GeoapifyRoutingResponse;

  if (!response.ok) {
    throw new Error(
      data.message ?? data.error ?? "Geoapify routing request failed.",
    );
  }

  return secondsToNearestFiveMinutes(data.results?.[0]?.time);
}

async function fetchTransitMinutes({
  apiKey,
  latitude,
  longitude,
  departureTime,
}: {
  apiKey: string;
  latitude: number;
  longitude: number;
  departureTime: Date;
}) {
  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude, longitude } } },
        destination: { location: { latLng: melbourneCbd } },
        travelMode: "TRANSIT",
        departureTime: departureTime.toISOString(),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    },
  );
  const data = (await response.json()) as GoogleRoutesResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Google Routes request failed.");
  }

  return durationToNearestFiveMinutes(data.routes?.[0]?.duration);
}

export async function getCbdTravel(
  latitude: number,
  longitude: number,
): Promise<CbdTravel> {
  const distanceMeters = getDistanceMeters(
    { latitude, longitude },
    melbourneCbd,
  );
  const geoapifyApiKey = process.env.GEOAPIFY_API_KEY;
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  const [drive, transit] = await Promise.allSettled([
    geoapifyApiKey
      ? fetchDrivingMinutes({
          apiKey: geoapifyApiKey,
          latitude,
          longitude,
        })
      : Promise.resolve(null),
    googleMapsApiKey
      ? fetchTransitMinutes({
          apiKey: googleMapsApiKey,
          latitude,
          longitude,
          departureTime: getNextTypicalTransitDeparture(),
        })
      : Promise.resolve(null),
  ]);
  const driveMinutes = drive.status === "fulfilled" ? drive.value : null;
  const transitMinutes = transit.status === "fulfilled" ? transit.value : null;

  if (drive.status === "rejected") {
    console.error("CBD driving route failed:", drive.reason);
  }

  if (transit.status === "rejected") {
    console.error("CBD transit route failed:", transit.reason);
  }

  const missingKeys = [
    !geoapifyApiKey ? "GEOAPIFY_API_KEY for driving" : null,
    !googleMapsApiKey ? "GOOGLE_MAPS_API_KEY for public transport" : null,
  ].filter((value): value is string => value !== null);
  const warning =
    missingKeys.length > 0
      ? `Travel times need ${missingKeys.join(" and ")}.`
      : driveMinutes === null || transitMinutes === null
        ? "Some travel times are temporarily unavailable."
        : null;

  return {
    distanceMeters,
    driveMinutes,
    transitMinutes,
    warning,
  };
}
