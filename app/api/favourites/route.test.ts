import { describe, it, expect, vi, beforeEach } from "vitest";

// The route depends on two outside systems: the auth layer (reads the session
// cookie) and the search store (talks to Postgres). Neither exists in CI, so
// we replace both with fakes we control and assert the route's own decision
// logic — status codes and validation — in isolation.
vi.mock("@/app/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("@/app/lib/services/searchStore", () => ({
  listSavedLocations: vi.fn(),
  setLocationSaved: vi.fn(),
}));

import { GET, POST, DELETE } from "./route";
import { auth } from "@/app/lib/auth";
import {
  listSavedLocations,
  setLocationSaved,
} from "@/app/lib/services/searchStore";

const getSession = vi.mocked(auth.api.getSession);
const mockListSavedLocations = vi.mocked(listSavedLocations);
const mockSetLocationSaved = vi.mocked(setLocationSaved);

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

// The route only reads session.user.id, so a minimal object stands in for the
// full better-auth session shape.
function signedInAs(userId: string): Session {
  return { user: { id: userId } } as unknown as Session;
}

function postRequest(body: string) {
  return new Request("http://test/api/favourites", { method: "POST", body });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/favourites", () => {
  it("returns 401 when no one is signed in", async () => {
    getSession.mockResolvedValue(null);

    const response = await GET(new Request("http://test/api/favourites"));

    expect(response.status).toBe(401);
    expect(mockListSavedLocations).not.toHaveBeenCalled();
  });

  it("returns the signed-in user's saved locations", async () => {
    getSession.mockResolvedValue(signedInAs("user-1"));
    mockListSavedLocations.mockResolvedValue([]);

    const response = await GET(new Request("http://test/api/favourites"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, searches: [] });
    // The list must be scoped to the caller, never another user's saves.
    expect(mockListSavedLocations).toHaveBeenCalledWith("user-1");
  });
});

describe("POST /api/favourites", () => {
  it("rejects a body that is not valid JSON with 400", async () => {
    const response = await POST(postRequest("not json"));

    expect(response.status).toBe(400);
    // Parsing happens before the session lookup, so a malformed body is
    // rejected without ever touching auth.
    expect(getSession).not.toHaveBeenCalled();
  });

  it("requires a locationId", async () => {
    const response = await POST(postRequest(JSON.stringify({})));

    expect(response.status).toBe(400);
  });

  it("returns 401 when signed out", async () => {
    getSession.mockResolvedValue(null);

    const response = await POST(
      postRequest(JSON.stringify({ locationId: "loc-1" })),
    );

    expect(response.status).toBe(401);
    expect(mockSetLocationSaved).not.toHaveBeenCalled();
  });

  it("returns 404 when the location does not exist", async () => {
    getSession.mockResolvedValue(signedInAs("user-1"));
    mockSetLocationSaved.mockResolvedValue(false);

    const response = await POST(
      postRequest(JSON.stringify({ locationId: "missing" })),
    );

    expect(response.status).toBe(404);
  });

  it("saves the location and returns ok for a valid request", async () => {
    getSession.mockResolvedValue(signedInAs("user-1"));
    mockSetLocationSaved.mockResolvedValue(true);

    const response = await POST(
      postRequest(JSON.stringify({ locationId: "loc-1" })),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockSetLocationSaved).toHaveBeenCalledWith("user-1", "loc-1", true);
  });
});

describe("DELETE /api/favourites", () => {
  it("requires an id query parameter", async () => {
    const response = await DELETE(
      new Request("http://test/api/favourites", { method: "DELETE" }),
    );

    expect(response.status).toBe(400);
  });

  it("unsaves the location for a valid request", async () => {
    getSession.mockResolvedValue(signedInAs("user-1"));
    mockSetLocationSaved.mockResolvedValue(true);

    const response = await DELETE(
      new Request("http://test/api/favourites?id=loc-1", { method: "DELETE" }),
    );

    expect(response.status).toBe(200);
    // false = unsave, the mirror of the POST save path.
    expect(mockSetLocationSaved).toHaveBeenCalledWith("user-1", "loc-1", false);
  });
});
