import type { TerrainLevel, TerrainSummary } from "./types";

// Terrain is sampled along eight straight lines (N, NE, E, ...) leading away
// from the address. Straight lines do not follow streets, so the result
// describes how hilly the surrounding land is, not the exact grade of a
// particular road.
const terrainRadiusMeters = 1500;
export const terrainSpacingMeters = 150;
const bearingCount = 8;

// Around 5% is where a small-engine car, a bike, or someone walking with
// shopping starts to notice a climb.
export const steepGradePercent = 5;

const metersPerDegreeLatitude = 111320;

type Point = { latitude: number; longitude: number };

export function buildTerrainSamplePoints(origin: Point): Point[] {
  const stepsPerLine = terrainRadiusMeters / terrainSpacingMeters;
  const metersPerDegreeLongitude =
    metersPerDegreeLatitude * Math.cos((origin.latitude * Math.PI) / 180);
  const points: Point[] = [origin];

  for (let line = 0; line < bearingCount; line += 1) {
    const bearing = (line / bearingCount) * 2 * Math.PI;

    for (let step = 1; step <= stepsPerLine; step += 1) {
      const distance = step * terrainSpacingMeters;
      points.push({
        latitude:
          origin.latitude +
          (distance * Math.cos(bearing)) / metersPerDegreeLatitude,
        longitude:
          origin.longitude +
          (distance * Math.sin(bearing)) / metersPerDegreeLongitude,
      });
    }
  }

  return points;
}

function getTerrainLevel(averageGradePercent: number): TerrainLevel {
  if (averageGradePercent < 1.5) return "flat";
  if (averageGradePercent < 3) return "gentle";
  if (averageGradePercent < 5) return "hilly";
  return "steep";
}

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10;

// Elevations must be in the same order as buildTerrainSamplePoints: the
// origin first, then each line from nearest to farthest.
export function summariseTerrain(elevations: number[]): TerrainSummary {
  const stepsPerLine = terrainRadiusMeters / terrainSpacingMeters;

  if (elevations.length !== 1 + bearingCount * stepsPerLine) {
    throw new Error("Unexpected number of terrain samples.");
  }

  const grades: number[] = [];

  for (let line = 0; line < bearingCount; line += 1) {
    let previous = elevations[0];

    for (let step = 1; step <= stepsPerLine; step += 1) {
      const current = elevations[line * stepsPerLine + step];
      grades.push((Math.abs(current - previous) / terrainSpacingMeters) * 100);
      previous = current;
    }
  }

  const averageGradePercent =
    grades.reduce((sum, grade) => sum + grade, 0) / grades.length;

  return {
    level: getTerrainLevel(averageGradePercent),
    radiusMeters: terrainRadiusMeters,
    elevationRangeMeters: Math.round(
      Math.max(...elevations) - Math.min(...elevations),
    ),
    averageGradePercent: roundToOneDecimal(averageGradePercent),
    steepestGradePercent: roundToOneDecimal(Math.max(...grades)),
    steepShare:
      Math.round(
        (grades.filter((grade) => grade >= steepGradePercent).length /
          grades.length) *
          100,
      ) / 100,
  };
}
