import "server-only";

import { getCbdTravel } from "./cbdTravel";
import type { AnalystTool } from "./locationAnalyst";
import {
  getRentalEstimate,
  isRentalPropertyType,
  rentalPropertyTypes,
} from "./rentalReports";
import { getTerrainSummary } from "./terrain";

const noParameters = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
};

// The tools the analyst may call about one saved location. Each one wraps a
// service the website already uses. The coordinates come from the database,
// never from the model, so the model cannot spend our API keys on other
// places. Field names ending in "Meters" are distances, like the rest of the
// analyst's data.
export function createLocationTools(
  latitude: number,
  longitude: number,
): AnalystTool[] {
  return [
    {
      name: "get_cbd_travel",
      description:
        "Travel from this location to Melbourne CBD (Melbourne Town Hall): straight-line distance, driving time, and public transport time for a weekday 8:00 am departure. Times are rounded to the nearest 5 minutes; null means that time is unavailable.",
      parameters: noParameters,
      label: "travel to Melbourne CBD",
      async run() {
        const travel = await getCbdTravel(latitude, longitude);

        return {
          destination: "Melbourne CBD (Melbourne Town Hall)",
          straightLineDistanceMeters: travel.distanceMeters,
          driveMinutes: travel.driveMinutes,
          transitMinutes: travel.transitMinutes,
          transitDeparture: "weekday 8:00 am",
          note: travel.warning,
        };
      },
    },
    {
      name: "get_terrain",
      description:
        "How hilly the land is within 1.5 km of this location, from elevation samples: level (flat, gentle, hilly or steep), average and steepest grade in percent, elevation range, and the share of stretches at 5% grade or more. It describes the area, not one street.",
      parameters: noParameters,
      label: "the local terrain",
      async run() {
        const terrain = await getTerrainSummary(latitude, longitude);

        return {
          level: terrain.level,
          radiusMeters: terrain.radiusMeters,
          averageGradePercent: terrain.averageGradePercent,
          steepestGradePercent: terrain.steepestGradePercent,
          elevationRangeMeters: terrain.elevationRangeMeters,
          steepStretchesPercent: Math.round(terrain.steepShare * 100),
        };
      },
    },
    {
      name: "get_rent_estimate",
      description:
        "Median weekly rent in AUD from rent reports this app's users submitted near this location, for one property type and bedroom count. confidence is none (no reports), early (1-2 reports) or community (3 or more). Use the property type and bedrooms the renter mentions; if they give none, use apartment with 2 bedrooms and say which you used.",
      parameters: {
        type: "object",
        properties: {
          propertyType: { type: "string", enum: rentalPropertyTypes },
          bedrooms: { type: "integer", minimum: 0, maximum: 10 },
        },
        required: ["propertyType", "bedrooms"],
        additionalProperties: false,
      },
      label: "local rent reports",
      async run({ propertyType, bedrooms }) {
        // Strict mode already holds the model to the schema; check again
        // because model output is untrusted input.
        if (
          !isRentalPropertyType(propertyType) ||
          typeof bedrooms !== "number" ||
          !Number.isInteger(bedrooms) ||
          bedrooms < 0 ||
          bedrooms > 10
        ) {
          throw new Error("Invalid rent estimate arguments.");
        }

        const estimate = await getRentalEstimate(
          latitude,
          longitude,
          propertyType,
          bedrooms,
        );

        return {
          propertyType,
          bedrooms,
          medianWeeklyRent: estimate.medianWeeklyRent,
          reportCount: estimate.reportCount,
          searchRadiusMeters: estimate.radiusMeters,
          confidence: estimate.confidence,
        };
      },
    },
  ];
}
