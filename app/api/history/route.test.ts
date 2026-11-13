import { describe, it, expect, vi, beforeEach } from "vitest";

// Same approach as the favourites tests: fake the auth layer and the search
// store so only the route's own decisions (status codes, validation) run.
vi.mock("@/app/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("@/app/lib/services/searchStore", () => ({
  listRecentSearches: vi.fn(),
  removeUserSearch: vi.fn(),
}));

import { DELETE } from "./route";
import { auth } from "@/app/lib/auth";
import { removeUserSearch } from "@/app/lib/services/searchStore";

const getSession = vi.mocked(auth.api.getSession);
const mockRemoveUserSearch = vi.mocked(removeUserSearch);

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

function signedInAs(userId: string): Session {
  return { user: { id: userId } } as unknown as Session;
}

const deleteRequest = (url: string) => new Request(url, { method: "DELETE" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/history", () => {
  it("requires an id query parameter", async () => {
    const response = await DELETE(deleteRequest("http://test/api/history"));

    expect(response.status).toBe(400);
    expect(mockRemoveUserSearch).not.toHaveBeenCalled();
  });

  it("returns 401 when signed out", async () => {
    getSession.mockResolvedValue(null);

    const response = await DELETE(
      deleteRequest("http://test/api/history?id=loc-1"),
    );

    expect(response.status).toBe(401);
    expect(mockRemoveUserSearch).not.toHaveBeenCalled();
  });

  it("removes the search from the signed-in user's history", async () => {
    getSession.mockResolvedValue(signedInAs("user-1"));
    mockRemoveUserSearch.mockResolvedValue(undefined);

    const response = await DELETE(
      deleteRequest("http://test/api/history?id=loc-1"),
    );

    expect(response.status).toBe(200);
    expect(mockRemoveUserSearch).toHaveBeenCalledWith("user-1", "loc-1");
  });
});
