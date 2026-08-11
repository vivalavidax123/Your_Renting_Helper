import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/db", () => ({
  prisma: {
    rentalReport: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from "@/app/lib/db";
import {
  getLatestRentalReport,
  getRentalEstimate,
  getSuggestedRentalProfile,
  saveRentalReport,
} from "./rentalReports";

const findMany = vi.mocked(prisma.rentalReport.findMany);
const findFirst = vi.mocked(prisma.rentalReport.findFirst);
const upsert = vi.mocked(prisma.rentalReport.upsert);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRentalEstimate", () => {
  it("uses the smallest radius with three comparable reports and returns their median", async () => {
    findMany.mockResolvedValue([
      { latitude: -37.81, longitude: 144.96, weeklyRent: 500 },
      { latitude: -37.811, longitude: 144.96, weeklyRent: 650 },
      { latitude: -37.812, longitude: 144.96, weeklyRent: 550 },
      { latitude: -37.84, longitude: 144.96, weeklyRent: 1200 },
    ] as never);

    const estimate = await getRentalEstimate(
      -37.81,
      144.96,
      "apartment",
      1,
    );

    expect(estimate).toEqual({
      medianWeeklyRent: 550,
      reportCount: 3,
      radiusMeters: 1000,
      confidence: "community",
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ propertyType: "apartment", bedrooms: 1 }),
      }),
    );
  });

  it("marks a sparse median as early data", async () => {
    findMany.mockResolvedValue([
      { latitude: -37.81, longitude: 144.96, weeklyRent: 500 },
      { latitude: -37.82, longitude: 144.96, weeklyRent: 700 },
    ] as never);

    const estimate = await getRentalEstimate(
      -37.81,
      144.96,
      "house",
      3,
    );

    expect(estimate).toEqual({
      medianWeeklyRent: 600,
      reportCount: 2,
      radiusMeters: 10000,
      confidence: "early",
    });
  });
});

describe("saveRentalReport", () => {
  it("upserts a stable per-user location and property key", async () => {
    upsert.mockResolvedValue({} as never);

    await saveRentalReport({
      userId: "user-1",
      formattedAddress: "Melbourne VIC",
      latitude: -37.81361,
      longitude: 144.96305,
      weeklyRent: 620,
      propertyType: "apartment",
      bedrooms: 2,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_locationKey: {
            userId: "user-1",
            locationKey: "-37.8136,144.9631:apartment:2",
          },
        },
      }),
    );
  });
});

describe("getLatestRentalReport", () => {
  it("restores the newest report for the signed-in user and location", async () => {
    findFirst.mockResolvedValue({
      weeklyRent: 430,
      propertyType: "house",
      bedrooms: 3,
    } as never);

    const report = await getLatestRentalReport(
      "user-1",
      -37.81361,
      144.96305,
    );

    expect(report).toEqual({
      weeklyRent: 430,
      propertyType: "house",
      bedrooms: 3,
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        locationKey: { startsWith: "-37.8136,144.9631:" },
      },
      orderBy: { updatedAt: "desc" },
      select: { weeklyRent: true, propertyType: true, bedrooms: true },
    });
  });
});

describe("getSuggestedRentalProfile", () => {
  it("chooses the strongest like-for-like group within 10 km", async () => {
    findMany.mockResolvedValue([
      {
        latitude: -37.811,
        longitude: 144.96,
        propertyType: "house",
        bedrooms: 3,
      },
      {
        latitude: -37.812,
        longitude: 144.96,
        propertyType: "house",
        bedrooms: 3,
      },
      {
        latitude: -37.813,
        longitude: 144.96,
        propertyType: "apartment",
        bedrooms: 2,
      },
    ] as never);

    const profile = await getSuggestedRentalProfile(-37.81, 144.96);

    expect(profile).toEqual({ propertyType: "house", bedrooms: 3 });
  });
});
