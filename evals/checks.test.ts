import { describe, expect, it } from "vitest";

import {
  collectEvidence,
  countWords,
  findBannedPhrases,
  findNumericClaims,
  findUnsupportedNumbers,
} from "./checks";

describe("countWords", () => {
  it("counts words across spaces and new lines", () => {
    expect(countWords("  One two\nthree  - four ")).toBe(5);
  });
});

describe("findBannedPhrases", () => {
  it("finds leaked implementation details", () => {
    expect(findBannedPhrases("Based on the JSON you sent")).toEqual(["JSON"]);
    expect(findBannedPhrases("A cafe is 200 m away.")).toEqual([]);
  });
});

describe("findNumericClaims", () => {
  it("reads distances, walk times, percentages and scores", () => {
    expect(
      findNumericClaims(
        "Coles is 650 m away (an 8-minute walk), the station 1.2km, transport counts 28% and scores 72/100.",
      ),
    ).toEqual([
      { text: "650 m", kind: "meters", value: 650 },
      { text: "8-minute", kind: "minutes", value: 8 },
      { text: "1.2km", kind: "meters", value: 1200 },
      { text: "28%", kind: "plain", value: 28 },
      { text: "72/100", kind: "plain", value: 72 },
    ]);
  });

  it("reads thousands separators and ignores words that start with m", () => {
    expect(findNumericClaims("about 1,500 metres and 5 more cafes")).toEqual([
      { text: "1,500 metres", kind: "meters", value: 1500 },
    ]);
  });
});

describe("collectEvidence", () => {
  it("treats *Meters keys as distances and reads numbers inside strings", () => {
    const evidence = collectEvidence({
      overallScore: 72,
      scoreBreakdown: [{ closestDistanceMeters: 640, weight: 28 }],
      practicalIndicators: [{ value: "8 min avg", detail: "within 1.5 km" }],
    });

    expect(evidence.meters).toEqual([640, 1500]);
    expect(evidence.plain).toEqual([72, 28]);
    // 8 from the string, then 640 / 80 and 1500 / 80 as walk times.
    expect(evidence.minutes).toEqual([8, 8, 19]);
  });

  it("merges several contexts for comparison answers", () => {
    const evidence = collectEvidence(
      { overallScore: 72 },
      { overallScore: 64 },
    );

    expect(evidence.plain).toEqual([72, 64]);
  });
});

describe("findUnsupportedNumbers", () => {
  const evidence = collectEvidence({
    overallScore: 72,
    weight: 28,
    nearest: [{ distanceMeters: 650 }, { distanceMeters: 2400 }],
  });

  it("accepts rounded distances and walk times derived from real ones", () => {
    expect(
      findUnsupportedNumbers(
        "The supermarket is 0.7 km away, about an 8 min walk. The mall is 2.4 km off. Transport counts 28%, overall 72/100.",
        evidence,
      ),
    ).toEqual([]);
  });

  it("flags numbers that no context supports", () => {
    expect(
      findUnsupportedNumbers(
        "The train to the city takes 25 minutes and the park is 300 m away; 90% of renters agree.",
        evidence,
      ),
    ).toEqual(["25 minutes", "300 m", "90%"]);
  });
});
