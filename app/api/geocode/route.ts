type GoogleGeocodeResult = {
  formatted_address: string;
  place_id: string;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    location_type: string;
  };
};

type GoogleGeocodeResponse = {
  status: string;
  error_message?: string;
  results?: GoogleGeocodeResult[];
};

const statusToCode: Record<string, number> = {
  INVALID_REQUEST: 400,
  ZERO_RESULTS: 404,
  OVER_DAILY_LIMIT: 429,
  OVER_QUERY_LIMIT: 429,
  REQUEST_DENIED: 502,
  UNKNOWN_ERROR: 502,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query || query.length < 3) {
    return Response.json(
      { ok: false, error: "Enter at least 3 characters to search." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        error: "Missing GOOGLE_MAPS_API_KEY in .env.local.",
      },
      { status: 500 },
    );
  }

  const geocodeUrl = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  geocodeUrl.searchParams.set("address", query);
  geocodeUrl.searchParams.set("region", "au");
  geocodeUrl.searchParams.set("key", apiKey);

  try {
    const response = await fetch(geocodeUrl, { cache: "no-store" });

    if (!response.ok) {
      return Response.json(
        { ok: false, error: "Geocoding service is unavailable." },
        { status: 502 },
      );
    }

    const data = (await response.json()) as GoogleGeocodeResponse;

    if (data.status !== "OK") {
      return Response.json(
        {
          ok: false,
          error:
            data.error_message ??
            (data.status === "ZERO_RESULTS"
              ? "No matching location found."
              : "Could not geocode this location."),
          status: data.status,
        },
        { status: statusToCode[data.status] ?? 502 },
      );
    }

    const result = data.results?.[0];

    if (!result) {
      return Response.json(
        { ok: false, error: "No matching location found." },
        { status: 404 },
      );
    }

    return Response.json({
      ok: true,
      location: {
        query,
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        locationType: result.geometry.location_type,
        types: result.types,
      },
    });
  } catch {
    return Response.json(
      { ok: false, error: "Could not reach the geocoding service." },
      { status: 502 },
    );
  }
}
