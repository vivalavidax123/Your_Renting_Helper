import type { NearbyPlace, PlaceGroup } from "./types";

export function formatDistance(distanceMeters: number) {
  return distanceMeters < 1000
    ? `${distanceMeters} m`
    : `${(distanceMeters / 1000).toFixed(1)} km`;
}

// Evidence dates are shown in Australian day/month order everywhere, whatever
// the browser locale, so the same date never reads differently across pages.
// The fixed Melbourne time zone keeps server and browser output identical and
// matches the renter's calendar day (a UTC date is a day behind before ~10am).
export function formatEvidenceDate(value: string) {
  return new Date(value).toLocaleDateString("en-AU", {
    timeZone: "Australia/Melbourne",
  });
}

export function formatRadius(radiusMeters: number) {
  return radiusMeters < 1000
    ? `${radiusMeters} m`
    : `${radiusMeters / 1000} km`;
}

export function formatReviewSummary(place: NearbyPlace) {
  if (place.userRatingCount === 0) {
    return "No reviews";
  }

  const rating =
    place.rating === null ? "" : `${place.rating.toFixed(1)} rating, `;
  const reviewLabel = place.userRatingCount === 1 ? "review" : "reviews";

  return `${rating}${place.userRatingCount.toLocaleString()} ${reviewLabel}`;
}

export function formatGroupScope(group: PlaceGroup) {
  if (group.id === "transport") {
    return "bus stops within 1 km or closest found + nearest stations";
  }

  return `${group.places.length} found within ${formatRadius(group.radiusMeters)}`;
}

export function formatPlaceType(primaryType: string) {
  return primaryType.replaceAll("_", " ");
}

export function formatDepartureTime(value: string | null) {
  if (!value) {
    return null;
  }

  const gtfsTime = value.match(/^(\d{1,2}):(\d{2})/);

  if (gtfsTime) {
    return `${gtfsTime[1].padStart(2, "0")}:${gtfsTime[2]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function parseCoordinate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeStationName(value: string) {
  return normalizeText(value)
    .replace(/\b(railway|train|metro|v line|vline)\b/g, " ")
    .replace(/\bstation\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// The page to return to after sign-in, from ?next=. Only same-site paths are
// allowed: browsers read "//host" and "/\host" as another site (and drop tabs
// and newlines first), so accepting those would turn ?next= into an open
// redirect that sends a freshly signed-in user to someone else's page.
export function safeNextPath(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(value)
  ) {
    return "/";
  }

  return value;
}
