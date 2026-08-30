import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("@/app/lib/scoring", () => ({
  scorePlaceGroups: vi.fn(),
}));
vi.mock("@/app/lib/services/placeSearch", () => ({
  fetchPlaceGroups: vi.fn(),
}));
vi.mock("@/app/lib/services/searchStore", () => ({
  buildCacheKey: vi.fn(() => "cache-key"),
  findFreshSnapshot: vi.fn(),
  recordUserSearch: vi.fn(),
  saveSnapshot: vi.fn(),
}));

import { GET } from "./route";
import { auth } from "@/app/lib/auth";
import { scorePlaceGroups } from "@/app/lib/scoring";
import { fetchPlaceGroups } from "@/app/lib/services/placeSearch";
import {
  findFreshSnapshot,
  saveSnapshot,
} from "@/app/lib/services/searchStore";

const getSession = vi.mocked(auth.api.getSession);
const scoreGroups = vi.mocked(scorePlaceGroups);
const fetchGroups = vi.mocked(fetchPlaceGroups);
const findSnapshot = vi.mocked(findFreshSnapshot);
const persistSnapshot = vi.mocked(saveSnapshot);

const request = () =>
  new Request("http://test/api/places?lat=-37.81&lng=144.96&profile=carFree");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GOOGLE_MAPS_API_KEY", "maps-key");
  getSession.mockResolvedValue(null);
  scoreGroups.mockReturnValue({ overallScore: 72, scores: [] });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/places location identity", () => {
  it("returns the stored location id with a cached result", async () => {
    findSnapshot.mockResolvedValue({
      locationId: "location-cached",
      groups: [],
      fetchedAt: "2026-08-30T00:00:00.000Z",
    });

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.propertyId).toBe("location-cached");
    expect(body.cached).toBe(true);
    expect(fetchGroups).not.toHaveBeenCalled();
  });

  it("returns the newly persisted location id with a live result", async () => {
    findSnapshot.mockResolvedValue(null);
    fetchGroups.mockResolvedValue([]);
    persistSnapshot.mockResolvedValue("location-new");

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.propertyId).toBe("location-new");
    expect(body.cached).toBe(false);
  });

  it("keeps search usable but reports no id when persistence fails", async () => {
    findSnapshot.mockResolvedValue(null);
    fetchGroups.mockResolvedValue([]);
    persistSnapshot.mockRejectedValue(new Error("database unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.propertyId).toBeNull();
  });
});
