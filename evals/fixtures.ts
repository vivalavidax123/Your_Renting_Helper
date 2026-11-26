// Hand-written nearby-place data and tool results for three kinds of
// location. Every number is known, so the deterministic checks can tell a
// real fact from an invented one. Real snapshots can be added later in the
// same shape.

import { rentScoreCategories } from "@/app/lib/categories";
import type { NearbyPlace, PlaceGroup } from "@/app/lib/types";

// [name, primaryType, distanceMeters, rating]
type PlaceRow = [string, string, number, number | null];

// What the analyst tools return for this fixture, in the same shape as the
// real tools in app/lib/services/analystTools.ts. The rent result is used
// for whatever property type and bedroom count the model asks about.
export type FixtureToolResults = {
  get_cbd_travel: object;
  get_terrain: object;
  get_rent_estimate: object;
};

export type Fixture = {
  id: string;
  address: string;
  groups: PlaceGroup[];
  toolResults: FixtureToolResults;
};

function cbdTravel(
  straightLineDistanceMeters: number,
  driveMinutes: number | null,
  transitMinutes: number | null,
) {
  return {
    destination: "Melbourne CBD (Melbourne Town Hall)",
    straightLineDistanceMeters,
    driveMinutes,
    transitMinutes,
    transitDeparture: "weekday 8:00 am",
    note:
      driveMinutes === null || transitMinutes === null
        ? "Some travel times are temporarily unavailable."
        : null,
  };
}

function buildGroups(
  fixtureId: string,
  rows: Record<string, PlaceRow[]>,
): PlaceGroup[] {
  return rentScoreCategories.map((category) => ({
    id: category.id,
    label: category.label,
    radiusMeters: category.radiusMeters,
    places: (rows[category.id] ?? []).map(
      ([name, primaryType, distanceMeters, rating], index): NearbyPlace => ({
        id: `${fixtureId}-${category.id}-${index}`,
        name,
        address: `${name}, Melbourne VIC`,
        primaryType,
        latitude: -37.8,
        longitude: 144.96,
        distanceMeters,
        rating,
        userRatingCount: rating === null ? 0 : 120,
        source: "generic",
      }),
    ),
  }));
}

// Dense inner suburb: everything within a short walk.
const innerCity: Fixture = {
  id: "inner-city",
  address: "12 Lygon Street, Brunswick East VIC 3057",
  groups: buildGroups("inner-city", {
    shopping_centres: [["Barkly Square", "shopping_mall", 1450, 4.1]],
    groceries: [
      ["Coles Brunswick East", "supermarket", 320, 4.0],
      ["Woolworths Lygon Street", "supermarket", 780, 4.1],
      ["Aldi Brunswick", "supermarket", 1600, 4.2],
      ["Lygon Organic Grocer", "grocery_store", 210, 4.6],
    ],
    food: [
      ["Brunetti Cafe", "cafe", 150, 4.5],
      ["Small Batch Roasting", "cafe", 260, 4.6],
      ["Tiamo Pizza", "restaurant", 410, 4.3],
      ["Bakers Delight", "bakery", 330, 4.2],
      ["Pho Lygon", "restaurant", 520, 4.4],
      ["Guzman y Gomez", "meal_takeaway", 900, 4.0],
      ["East Brunswick Bistro", "restaurant", 640, 4.5],
    ],
    transport: [
      ["Lygon St/Glenlyon Rd tram stop", "transit_station", 120, null],
      ["Nicholson St tram stop", "transit_station", 560, null],
      ["Jewell Station", "train_station", 1700, 3.9],
      ["Glenlyon Rd bus stop", "bus_stop", 240, null],
    ],
    health: [
      ["Lygon Medical Centre", "doctor", 380, 4.3],
      ["Priceline Pharmacy", "pharmacy", 290, 4.2],
      ["Brunswick Dental", "dentist", 700, 4.7],
    ],
    fitness: [
      ["Anytime Fitness Brunswick East", "gym", 450, 4.3],
      ["Fleming Park", "park", 600, 4.5],
      ["Brunswick Baths", "swimming_pool", 1900, 4.2],
    ],
    fuel: [["Shell Nicholson St", "gas_station", 1300, 3.8]],
    services: [
      ["Australia Post Brunswick East", "post_office", 500, 3.6],
      ["Commonwealth Bank", "bank", 820, 3.5],
    ],
  }),
  toolResults: {
    get_cbd_travel: cbdTravel(5800, 20, 30),
    get_terrain: {
      level: "gentle",
      radiusMeters: 1500,
      averageGradePercent: 1.8,
      steepestGradePercent: 4.6,
      elevationRangeMeters: 24,
      steepStretchesPercent: 0,
    },
    get_rent_estimate: {
      medianWeeklyRent: 560,
      reportCount: 4,
      searchRadiusMeters: 1000,
      confidence: "community",
    },
  },
};

// Outer growth-area suburb: one big centre, everything else a drive away.
const outerSuburb: Fixture = {
  id: "outer-suburb",
  address: "8 Wattle Way, Tarneit VIC 3029",
  groups: buildGroups("outer-suburb", {
    shopping_centres: [["Tarneit Central", "shopping_mall", 2600, 4.1]],
    groceries: [
      ["Woolworths Tarneit", "supermarket", 2550, 4.0],
      ["Coles Tarneit West", "supermarket", 2900, 3.9],
    ],
    food: [
      ["Tarneit Central Food Court", "restaurant", 2600, 3.9],
      ["McDonald's Tarneit", "meal_takeaway", 1800, 3.6],
    ],
    transport: [
      ["Wattle Way bus stop", "bus_stop", 350, null],
      ["Tarneit Station", "train_station", 2700, 3.7],
    ],
    health: [["Tarneit Medical Clinic", "doctor", 2500, 4.0]],
    fitness: [["Wetlands Reserve", "park", 900, 4.4]],
    fuel: [
      ["7-Eleven Tarneit", "gas_station", 1500, 3.7],
      ["BP Leakes Rd", "gas_station", 2200, 3.8],
    ],
    services: [],
  }),
  toolResults: {
    get_cbd_travel: cbdTravel(24500, 35, 60),
    get_terrain: {
      level: "flat",
      radiusMeters: 1500,
      averageGradePercent: 0.6,
      steepestGradePercent: 2.1,
      elevationRangeMeters: 9,
      steepStretchesPercent: 0,
    },
    get_rent_estimate: {
      medianWeeklyRent: 480,
      reportCount: 1,
      searchRadiusMeters: 10000,
      confidence: "early",
    },
  },
};

// Several categories returned nothing, so the analyst must say data is
// missing instead of filling the gap.
const sparseData: Fixture = {
  id: "sparse-data",
  address: "40 Ridge Road, Kinglake VIC 3763",
  groups: buildGroups("sparse-data", {
    groceries: [["Kinglake IGA", "supermarket", 1100, 4.1]],
    food: [["Kinglake Pub", "restaurant", 1150, 4.2]],
    transport: [["Ridge Rd bus stop", "bus_stop", 1900, null]],
    fuel: [["Kinglake Fuel", "gas_station", 1200, 3.9]],
  }),
  // No public transport time and no rent reports: the analyst has to say so.
  toolResults: {
    get_cbd_travel: cbdTravel(44000, 60, null),
    get_terrain: {
      level: "steep",
      radiusMeters: 1500,
      averageGradePercent: 6.4,
      steepestGradePercent: 14.2,
      elevationRangeMeters: 160,
      steepStretchesPercent: 38,
    },
    get_rent_estimate: {
      medianWeeklyRent: null,
      reportCount: 0,
      searchRadiusMeters: 10000,
      confidence: "none",
    },
  },
};

export const fixtures = { innerCity, outerSuburb, sparseData };

export type FixtureId = keyof typeof fixtures;
