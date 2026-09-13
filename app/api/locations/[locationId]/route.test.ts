import { expect, it, vi, beforeEach } from "vitest";
vi.mock("@/app/lib/services/searchStore", () => ({
  getStoredLocation: vi.fn(),
}));
import { getStoredLocation } from "@/app/lib/services/searchStore";
import { GET } from "./route";
beforeEach(() => vi.clearAllMocks());
const call = (id: string) =>
  GET(new Request("http://localhost/api/locations/" + id), {
    params: Promise.resolve({ locationId: id }),
  });
it("rejects invalid IDs before database access", async () => {
  expect((await call("bad.id")).status).toBe(400);
  expect(getStoredLocation).not.toHaveBeenCalled();
});
it("returns missing evidence distinctly", async () => {
  vi.mocked(getStoredLocation).mockResolvedValue(null);
  expect((await call("missing")).status).toBe(404);
});
it("returns stored groups without a provider request", async () => {
  const stored = {
    locationId: "a",
    location: {
      query: "A",
      formattedAddress: "A",
      placeId: "g",
      latitude: 1,
      longitude: 2,
      locationType: "ROOFTOP",
      types: [],
    },
    groups: [],
    cached: true,
    fetchedAt: "2026-09-10T00:00:00Z",
  };
  vi.mocked(getStoredLocation).mockResolvedValue(stored);
  const response = await call("a");
  expect(await response.json()).toEqual({ ok: true, ...stored });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
it("keeps storage errors distinct from missing locations", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getStoredLocation).mockRejectedValue(new Error("offline"));
  expect((await call("a")).status).toBe(500);
  log.mockRestore();
});
