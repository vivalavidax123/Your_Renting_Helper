import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./searchStore", () => ({
  getLocationAnalysisSource: vi.fn(),
}));

import {
  assembleLocationAnalysisContext,
  buildLocationAnalysisContext,
} from "./locationAnalysis";
import { getLocationAnalysisSource } from "./searchStore";
import type { PlaceGroup } from "@/app/lib/types";

const locationSource = vi.mocked(getLocationAnalysisSource);

const groceries: PlaceGroup = {
  id: "groceries",
  label: "Groceries",
  radiusMeters: 3000,
  places: [
    {
      id: "far",
      name: "Far Market",
      address: "6 Example Street",
      primaryType: "supermarket",
      latitude: -37.81,
      longitude: 144.96,
      distanceMeters: 900,
      rating: 4.1,
      userRatingCount: 80,
      source: "generic",
    },
    ...[100, 200, 300, 400, 500].map((distanceMeters, index) => ({
      id: `near-${index}`,
      name: `Near Market ${index}`,
      address: `${index + 1} Example Street`,
      primaryType: "supermarket",
      latitude: -37.81,
      longitude: 144.96,
      distanceMeters,
      rating: index === 0 ? null : 4.2,
      userRatingCount: 60,
      source: "generic" as const,
    })),
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assembleLocationAnalysisContext", () => {
  it("uses profile-specific scores and keeps only the nearest amenities", () => {
    const context = assembleLocationAnalysisContext({
      propertyId: "location-1",
      address: "1 Test Street, Melbourne VIC",
      groups: [groceries],
      profile: "carOwner",
      dataAsOf: "2026-08-30T00:00:00.000Z",
    });

    expect(context.propertyId).toBe("location-1");
    expect(context.address).toBe("1 Test Street, Melbourne VIC");
    expect(context.suburb).toBeNull();
    expect(context.preferences.mobilityProfile).toBe("carOwner");
    expect(context.practicalIndicators).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Walkability" }),
        expect.objectContaining({ label: "Daily convenience" }),
        expect.objectContaining({ label: "Car reliance" }),
      ]),
    );
    expect(context.scoreBreakdown.find((score) => score.id === "groceries"))
      .toMatchObject({ count: 6, weight: 18, closestDistanceMeters: 100 });
    expect(
      context.nearbyAmenities.find(
        (category) => category.categoryId === "groceries",
      ),
    ).toMatchObject({
      count: 6,
      nearest: [
        { id: "near-0", distanceMeters: 100, rating: null },
        { id: "near-1", distanceMeters: 200 },
        { id: "near-2", distanceMeters: 300 },
        { id: "near-3", distanceMeters: 400 },
        { id: "near-4", distanceMeters: 500 },
      ],
    });
  });

  it("represents missing categories with empty amenity lists", () => {
    const context = assembleLocationAnalysisContext({
      propertyId: "location-1",
      address: "1 Test Street, Melbourne VIC",
      groups: [],
      profile: "carFree",
      dataAsOf: "2026-08-30T00:00:00.000Z",
    });

    expect(context.overallScore).toBe(0);
    expect(context.nearbyAmenities).toHaveLength(8);
    expect(context.practicalIndicators).toHaveLength(5);
    expect(context.nearbyAmenities).toContainEqual(
      expect.objectContaining({
        categoryId: "transport",
        count: 0,
        nearest: [],
      }),
    );
  });
});

describe("buildLocationAnalysisContext", () => {
  it("loads the latest stored location data", async () => {
    locationSource.mockResolvedValue({
      id: "location-1",
      formattedAddress: "1 Test Street, Melbourne VIC",
      groups: [groceries],
      fetchedAt: "2026-08-30T00:00:00.000Z",
    });

    const context = await buildLocationAnalysisContext(
      "location-1",
      "carOwner",
    );

    expect(locationSource).toHaveBeenCalledWith("location-1");
    expect(context).toMatchObject({
      propertyId: "location-1",
      preferences: { mobilityProfile: "carOwner" },
      dataAsOf: "2026-08-30T00:00:00.000Z",
    });
  });

  it("returns null when the location or its score snapshot is unavailable", async () => {
    locationSource.mockResolvedValue(null);

    await expect(buildLocationAnalysisContext("missing")).resolves.toBeNull();
  });
});
