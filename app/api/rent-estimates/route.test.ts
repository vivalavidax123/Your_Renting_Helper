import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("@/app/lib/services/rentalReports", () => ({
  getLatestRentalReport: vi.fn(),
  getRentalEstimate: vi.fn(),
  getSuggestedRentalProfile: vi.fn(),
  rentalPropertyTypes: ["apartment", "house", "townhouse", "unit", "other"],
  saveRentalReport: vi.fn(),
}));

import { GET } from "./route";
import { auth } from "@/app/lib/auth";
import {
  getLatestRentalReport,
  getRentalEstimate,
  getSuggestedRentalProfile,
} from "@/app/lib/services/rentalReports";

const getSession = vi.mocked(auth.api.getSession);
const latestReport = vi.mocked(getLatestRentalReport);
const rentalEstimate = vi.mocked(getRentalEstimate);
const suggestedProfile = vi.mocked(getSuggestedRentalProfile);

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

beforeEach(() => {
  vi.clearAllMocks();
  rentalEstimate.mockResolvedValue({
    medianWeeklyRent: null,
    reportCount: 0,
    radiusMeters: 10000,
    confidence: "none",
  });
  suggestedProfile.mockResolvedValue(null);
});

describe("GET /api/rent-estimates", () => {
  it("returns the caller's latest report so the UI can restore its filters", async () => {
    getSession.mockResolvedValue({
      user: { id: "user-1" },
    } as unknown as Session);
    latestReport.mockResolvedValue({
      weeklyRent: 430,
      propertyType: "house",
      bedrooms: 3,
    });

    const response = await GET(
      new Request("http://test/api/rent-estimates?lat=-37.8136&lng=144.9631"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ownReport).toEqual({
      weeklyRent: 430,
      propertyType: "house",
      bedrooms: 3,
    });
    expect(latestReport).toHaveBeenCalledWith(
      "user-1",
      -37.8136,
      144.9631,
    );
  });

  it("keeps the public estimate anonymous when signed out", async () => {
    getSession.mockResolvedValue(null);

    const response = await GET(
      new Request("http://test/api/rent-estimates?lat=-37.8136&lng=144.9631"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ownReport).toBeNull();
    expect(latestReport).not.toHaveBeenCalled();
  });

  it("suggests an available nearby property group when the default is empty", async () => {
    getSession.mockResolvedValue(null);
    suggestedProfile.mockResolvedValue({
      propertyType: "house",
      bedrooms: 3,
    });

    const response = await GET(
      new Request("http://test/api/rent-estimates?lat=-37.8136&lng=144.9631"),
    );
    const body = await response.json();

    expect(body.suggestedProfile).toEqual({
      propertyType: "house",
      bedrooms: 3,
    });
    expect(suggestedProfile).toHaveBeenCalledWith(-37.8136, 144.9631);
  });
});
