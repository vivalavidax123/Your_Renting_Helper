import { afterEach, describe, expect, it, vi } from "vitest";
import { getTerrainSummary } from "./terrain";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function elevationResponse(elevations: number[], status = "OK") {
  return new Response(
    JSON.stringify({
      status,
      results: elevations.map((elevation) => ({ elevation })),
    }),
  );
}

describe("getTerrainSummary", () => {
  it("requests all sample points in one Elevation API call", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "google-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(elevationResponse(Array(81).fill(30)));
    vi.stubGlobal("fetch", fetchMock);

    const terrain = await getTerrainSummary(-37.85, 145.1);

    expect(terrain.level).toBe("flat");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/maps/api/elevation/json");
    expect(url.searchParams.get("locations")?.split("|")).toHaveLength(81);
    expect(url.searchParams.get("key")).toBe("google-key");
  });

  it("fails when the API returns a non-OK status", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "google-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(elevationResponse([], "REQUEST_DENIED")),
    );

    await expect(getTerrainSummary(-37.85, 145.1)).rejects.toThrow(
      "REQUEST_DENIED",
    );
  });

  it("fails without calling Google when no key is configured", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTerrainSummary(-37.85, 145.1)).rejects.toThrow(
      "GOOGLE_MAPS_API_KEY",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
