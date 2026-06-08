import type { TransportService } from "../types";
import { normalizeText } from "../utils";
import { getDistanceMeters } from "../scoring";
import type {
  TransitlandStop,
  TransitlandDeparture,
  TransitlandStopsResponse,
} from "../types";

const maxTransportBusStops = 4;
const maxTransportBusServicesPerStop = 4;
const transitlandDepartureWindowSeconds = 7200;
const transitlandBaseUrl = "https://transit.land/api/v2/rest";

function getTransitlandStopKey(stop: TransitlandStop) {
  return stop.onestop_id ?? (typeof stop.id === "number" ? String(stop.id) : null);
}

function getTransitlandRouteNumber(departure: TransitlandDeparture) {
  return (
    departure.trip?.route?.route_short_name ??
    departure.trip?.route?.route_id ??
    departure.trip?.trip_short_name ??
    ""
  ).trim();
}

function getTransitlandDestination(departure: TransitlandDeparture) {
  return (
    departure.stop_headsign ??
    departure.trip?.trip_headsign ??
    departure.trip?.route?.route_long_name ??
    ""
  ).trim();
}

function getTransitlandDepartureTime(departure: TransitlandDeparture) {
  return (
    departure.departure?.estimated ??
    departure.departure?.scheduled ??
    departure.departure_time ??
    null
  );
}

function getTransitlandBusServices(departures: TransitlandDeparture[] = []) {
  const servicesByRouteAndDestination = new Map<string, TransportService>();

  for (const departure of departures) {
    const routeNumber = getTransitlandRouteNumber(departure);
    const destination = getTransitlandDestination(departure);

    if (!routeNumber || !destination) {
      continue;
    }

    const key = `${normalizeText(routeNumber)}:${normalizeText(destination)}`;

    if (!servicesByRouteAndDestination.has(key)) {
      servicesByRouteAndDestination.set(key, {
        routeNumber,
        destination,
        departureTime: getTransitlandDepartureTime(departure),
      });
    }

    if (servicesByRouteAndDestination.size >= maxTransportBusServicesPerStop) {
      break;
    }
  }

  return Array.from(servicesByRouteAndDestination.values());
}

async function fetchTransitlandJson<T>({
  apiKey,
  pathName,
  searchParams,
}: {
  apiKey: string;
  pathName: string;
  searchParams: Record<string, string>;
}) {
  const url = new URL(`${transitlandBaseUrl}${pathName}`);

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      apikey: apiKey,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export async function fetchTransitlandBusDepartures({
  apiKey,
  stop,
}: {
  apiKey: string;
  stop: TransitlandStop;
}) {
  const stopKey = getTransitlandStopKey(stop);

  if (!stopKey) {
    return [];
  }

  const data = await fetchTransitlandJson<TransitlandStopsResponse>({
    apiKey,
    pathName: `/stops/${encodeURIComponent(stopKey)}/departures`,
    searchParams: {
      next: String(transitlandDepartureWindowSeconds),
      limit: "20",
      include_geometry: "false",
    },
  });

  return getTransitlandBusServices(data?.stops?.[0]?.departures);
}

export async function fetchTransitlandBusStops({
  apiKey,
  latitude,
  longitude,
  radiusMeters,
}: {
  apiKey: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}) {
  const origin = { latitude, longitude };
  const data = await fetchTransitlandJson<TransitlandStopsResponse>({
    apiKey,
    pathName: "/stops",
    searchParams: {
      lat: String(latitude),
      lon: String(longitude),
      radius: String(radiusMeters),
      served_by_route_type: "3",
      limit: "20",
    },
  });

  if (!data?.stops) {
    return [];
  }

  // To properly sort, we need to extract and sort the valid stops
  const validStops = data.stops.flatMap((stop) => {
    const [stopLongitude, stopLatitude] = stop.geometry?.coordinates ?? [];

    if (
      !stop.stop_name ||
      typeof stopLatitude !== "number" ||
      typeof stopLongitude !== "number"
    ) {
      return [];
    }

    const stopKey = getTransitlandStopKey(stop) ?? stop.stop_id;

    if (!stopKey) {
      return [];
    }

    const distanceMeters = getDistanceMeters(origin, {
      latitude: stopLatitude,
      longitude: stopLongitude,
    });

    if (distanceMeters > radiusMeters) {
      return [];
    }

    return [
      {
        stop,
        place: {
          id: `transitland:${stopKey}`,
          name: stop.stop_name,
          address: stop.stop_desc ?? stop.stop_code ?? "Stop details unavailable",
          primaryType: "bus_stop",
          latitude: stopLatitude,
          longitude: stopLongitude,
          distanceMeters,
          rating: null as number | null,
          userRatingCount: 0,
          source: "generic" as const,
        },
      },
    ];
  });

  // Sort valid stops
  const sortedStops = validStops.sort((a, b) => a.place.distanceMeters - b.place.distanceMeters).slice(0, maxTransportBusStops);

  return Promise.all(
    sortedStops.map(async ({ stop, place }) => {
      const transportServices = await fetchTransitlandBusDepartures({ apiKey, stop });
      return { ...place, transportServices };
    })
  );
}
