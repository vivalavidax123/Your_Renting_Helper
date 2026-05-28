type PlaceCategory = {
  id: string;
  label: string;
  brandTerms: string[];
};

type GooglePlace = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  primaryType?: string;
};

type GoogleNearbyResponse = {
  places?: GooglePlace[];
  error?: {
    message?: string;
    status?: string;
  };
};

const categories: PlaceCategory[] = [
  {
    id: "shopping",
    label: "Shopping",
    brandTerms: ["Woolworths", "Coles", "ALDI", "IGA"],
  },
  {
    id: "food",
    label: "Food & Cafes",
    brandTerms: [
      "McDonald's",
      "KFC",
      "Hungry Jack's",
      "Guzman y Gomez",
      "Starbucks",
      "Gloria Jean's",
    ],
  },
  {
    id: "transport",
    label: "Transport",
    brandTerms: ["Sydney Trains", "Metro station", "light rail station"],
  },
  {
    id: "health",
    label: "Health",
    brandTerms: [
      "Chemist Warehouse",
      "Priceline Pharmacy",
      "TerryWhite Chemmart",
      "Amcal Pharmacy",
    ],
  },
  {
    id: "fitness",
    label: "Fitness",
    brandTerms: ["Anytime Fitness", "Fitness First", "Snap Fitness", "Plus Fitness", "Zip Fitness"],
  },
  {
    id: "services",
    label: "Services",
    brandTerms: ["Australia Post", "Commonwealth Bank", "ANZ", "NAB", "Westpac"],
  },
  {
    id: "fuel",
    label: "Fuel & Automotive",
    brandTerms: ["Ampol", "BP", "Shell", "7-Eleven"],
  },
];

const searchRadiusMeters = 3000;

function parseCoordinate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getDistanceMeters(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
) {
  const earthRadiusMeters = 6371000;
  const latA = (origin.latitude * Math.PI) / 180;
  const latB = (destination.latitude * Math.PI) / 180;
  const deltaLat = ((destination.latitude - origin.latitude) * Math.PI) / 180;
  const deltaLng = ((destination.longitude - origin.longitude) * Math.PI) / 180;
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(latA) *
      Math.cos(latB) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Math.round(earthRadiusMeters * centralAngle);
}

function normalizeBrand(value: string) {
  return value
    .toLowerCase()
    .replaceAll("&", "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function placeMatchesBrand(placeName: string, brandTerm: string) {
  const normalizedName = normalizeBrand(placeName);
  const normalizedBrand = normalizeBrand(brandTerm);

  return normalizedName.includes(normalizedBrand);
}

async function fetchPlacesForBrand({
  apiKey,
  brandTerm,
  latitude,
  longitude,
}: {
  apiKey: string;
  brandTerm: string;
  latitude: number;
  longitude: number;
}) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType",
    },
    body: JSON.stringify({
      textQuery: brandTerm,
      pageSize: 3,
      locationBias: {
        circle: {
          center: {
            latitude,
            longitude,
          },
          radius: searchRadiusMeters,
        },
      },
      regionCode: "AU",
    }),
  });

  const data = (await response.json()) as GoogleNearbyResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Places search failed.");
  }

  return data.places ?? [];
}

async function fetchPlacesForCategory({
  apiKey,
  category,
  latitude,
  longitude,
}: {
  apiKey: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
}) {
  const origin = { latitude, longitude };
  const placesById = new Map<
    string,
    {
      id: string;
      name: string;
      address: string;
      primaryType: string;
      distanceMeters: number;
    }
  >();

  const brandResults = await Promise.all(
    category.brandTerms.map(async (brandTerm) => ({
      brandTerm,
      places: await fetchPlacesForBrand({
        apiKey,
        brandTerm,
        latitude,
        longitude,
      }),
    })),
  );

  for (const brandResult of brandResults) {
    for (const place of brandResult.places) {
        const placeLatitude = place.location?.latitude;
        const placeLongitude = place.location?.longitude;

        if (
          !place.id ||
          !place.displayName?.text ||
          typeof placeLatitude !== "number" ||
          typeof placeLongitude !== "number"
        ) {
          continue;
        }

      if (!placeMatchesBrand(place.displayName.text, brandResult.brandTerm)) {
        continue;
      }

      const distanceMeters = getDistanceMeters(origin, {
        latitude: placeLatitude,
        longitude: placeLongitude,
      });

      if (distanceMeters > searchRadiusMeters) {
        continue;
      }

      placesById.set(place.id, {
        id: place.id,
          name: place.displayName.text,
          address: place.formattedAddress ?? "Address unavailable",
          primaryType: place.primaryType ?? "place",
        distanceMeters,
      });
    }
  }

  return {
    id: category.id,
    label: category.label,
    places: Array.from(placesById.values()).sort(
      (a, b) => a.distanceMeters - b.distanceMeters,
    ),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = parseCoordinate(searchParams.get("lat"));
  const longitude = parseCoordinate(searchParams.get("lng"));

  if (latitude === null || longitude === null) {
    return Response.json(
      { ok: false, error: "Latitude and longitude are required." },
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

  try {
    const groups = await Promise.all(
      categories.map((category) =>
        fetchPlacesForCategory({
          apiKey,
          category,
          latitude,
          longitude,
        }),
      ),
    );

    return Response.json({ ok: true, groups });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not retrieve nearby places.",
      },
      { status: 502 },
    );
  }
}
