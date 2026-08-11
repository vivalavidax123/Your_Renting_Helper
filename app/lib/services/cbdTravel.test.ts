import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCbdTravel,
  getNextTypicalTransitDeparture,
} from "./cbdTravel";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getCbdTravel", () => {
  it("returns direct distance plus driving and transit minutes", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "geoapify-key");
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "google-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [{ time: 1880 }] })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ routes: [{ duration: "2700s" }] })),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCbdTravel(-37.9, 145.0);

    expect(result.distanceMeters).toBeGreaterThan(0);
    expect(result.driveMinutes).toBe(30);
    expect(result.transitMinutes).toBe(45);
    expect(result.warning).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const drivingUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(drivingUrl.origin).toBe("https://api.geoapify.com");
    expect(drivingUrl.searchParams.get("mode")).toBe("drive");
    expect(drivingUrl.searchParams.get("traffic")).toBe("free_flow");
    expect(drivingUrl.searchParams.get("apiKey")).toBe("geoapify-key");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
    const transitRequest = JSON.parse(
      String(fetchMock.mock.calls[1][1]?.body),
    ) as { departureTime?: string };
    expect(transitRequest.departureTime).toMatch(/T\d{2}:00:00\.000Z$/);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ cache: "no-store" });
  });

  it("still returns distance when no routing keys are configured", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "");
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");

    const result = await getCbdTravel(-37.9, 145.0);

    expect(result.distanceMeters).toBeGreaterThan(0);
    expect(result.driveMinutes).toBeNull();
    expect(result.transitMinutes).toBeNull();
    expect(result.warning).toContain("GEOAPIFY_API_KEY");
    expect(result.warning).toContain("GOOGLE_MAPS_API_KEY");
  });

  it("returns driving time when only Geoapify is configured", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "geoapify-key");
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ results: [{ time: 2000 }] })),
        ),
    );

    const result = await getCbdTravel(-37.9, 145.0);

    expect(result.driveMinutes).toBe(35);
    expect(result.transitMinutes).toBeNull();
    expect(result.warning).toContain(
      "GOOGLE_MAPS_API_KEY for public transport",
    );
  });
});

describe("getNextTypicalTransitDeparture", () => {
  it("uses 8am Tuesday in Melbourne standard time", () => {
    const departure = getNextTypicalTransitDeparture(
      new Date("2026-08-10T00:00:00.000Z"),
    );

    expect(departure.toISOString()).toBe("2026-08-10T22:00:00.000Z");
  });

  it("uses 8am Tuesday in Melbourne daylight-saving time", () => {
    const departure = getNextTypicalTransitDeparture(
      new Date("2026-12-07T00:00:00.000Z"),
    );

    expect(departure.toISOString()).toBe("2026-12-07T21:00:00.000Z");
  });
});
