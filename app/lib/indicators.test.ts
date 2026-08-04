import { describe, expect, it } from "vitest";
import { buildDerivedIndicators } from "./indicators";
import type { CategoryScore, NearbyPlace, PlaceGroup } from "./types";

function score(id: string, value: number, distance: number | null): CategoryScore {
  return {
    id,
    label: id,
    score: value,
    weight: 1,
    colorClass: "",
    detail: "",
    count: 1,
    closestDistanceMeters: distance,
    radiusMeters: 3000,
    explanation: "",
  };
}

function place(id: string, distanceMeters: number, primaryType = "place"): NearbyPlace {
  return {
    id,
    name: id,
    address: "Address",
    primaryType,
    latitude: 0,
    longitude: 0,
    distanceMeters,
    rating: null,
    userRatingCount: 0,
    source: "generic",
  };
}

describe("buildDerivedIndicators", () => {
  it("uses the nearest matching place without mutating source groups", () => {
    const farther = place("Far bus", 900, "bus_stop");
    const nearer = {
      ...place("Near bus", 240, "bus_stop"),
      transportServices: [
        { routeNumber: "10", destination: "City", departureTime: null },
      ],
    };
    const groups: PlaceGroup[] = [
      {
        id: "transport",
        label: "Transport",
        radiusMeters: 3000,
        places: [farther, nearer],
      },
    ];

    const indicators = buildDerivedIndicators(
      [score("transport", 75, 240)],
      groups,
    );

    expect(indicators[0].detailItems?.[0]).toEqual({
      label: "Bus 10",
      value: "3 min",
    });
    expect(groups[0].places.map(({ id }) => id)).toEqual(["Far bus", "Near bus"]);
  });

  it("returns the five stable indicator categories", () => {
    const indicators = buildDerivedIndicators([], []);

    expect(indicators.map(({ label }) => label)).toEqual([
      "Walkability",
      "Transit access",
      "Amenity density",
      "Daily convenience",
      "Car reliance",
    ]);
  });
});
