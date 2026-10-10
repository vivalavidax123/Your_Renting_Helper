import { describe, expect, it } from "vitest";
import { getDistanceMeters } from "./scoring";
import { buildTerrainSamplePoints, summariseTerrain } from "./terrain";

const origin = { latitude: -37.85, longitude: 145.1 };
const sampleCount = 81;

// Build elevations where every line climbs by `riseEachStep` metres per
// 150 m step, which is a constant grade of riseEachStep / 150.
function climbingElevations(riseEachStep: number) {
  const elevations = [100];

  for (let line = 0; line < 8; line += 1) {
    for (let step = 1; step <= 10; step += 1) {
      elevations.push(100 + step * riseEachStep);
    }
  }

  return elevations;
}

describe("buildTerrainSamplePoints", () => {
  it("starts at the origin and reaches 1.5 km on each line", () => {
    const points = buildTerrainSamplePoints(origin);

    expect(points).toHaveLength(sampleCount);
    expect(points[0]).toEqual(origin);
    expect(getDistanceMeters(origin, points[1])).toBeCloseTo(150, -1);
    expect(getDistanceMeters(origin, points[10])).toBeCloseTo(1500, -1);
    expect(getDistanceMeters(origin, points[80])).toBeCloseTo(1500, -1);
  });
});

describe("summariseTerrain", () => {
  it("labels level ground as flat", () => {
    const terrain = summariseTerrain(Array(sampleCount).fill(40));

    expect(terrain).toMatchObject({
      level: "flat",
      elevationRangeMeters: 0,
      averageGradePercent: 0,
      steepestGradePercent: 0,
      steepShare: 0,
    });
  });

  it("measures a steady 4% climb as hilly", () => {
    const terrain = summariseTerrain(climbingElevations(6));

    expect(terrain.level).toBe("hilly");
    expect(terrain.averageGradePercent).toBe(4);
    expect(terrain.elevationRangeMeters).toBe(60);
    expect(terrain.steepShare).toBe(0);
  });

  it("counts descents as well as climbs", () => {
    const terrain = summariseTerrain(climbingElevations(-9));

    expect(terrain.level).toBe("steep");
    expect(terrain.averageGradePercent).toBe(6);
    expect(terrain.steepShare).toBe(1);
  });

  it("reports a single steep pitch without hiding it in the average", () => {
    const elevations = Array(sampleCount).fill(50);
    elevations[5] = 65; // one 10% rise then a 10% drop on the first line

    const terrain = summariseTerrain(elevations);

    expect(terrain.level).toBe("flat");
    expect(terrain.steepestGradePercent).toBe(10);
    expect(terrain.steepShare).toBe(0.03);
  });

  it("rejects an unexpected number of samples", () => {
    expect(() => summariseTerrain([1, 2, 3])).toThrow();
  });
});
