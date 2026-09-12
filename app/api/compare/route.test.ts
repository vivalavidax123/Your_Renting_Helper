import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("@/app/lib/services/searchStore", () => ({
  areLocationsSavedByUser: vi.fn(),
  getComparisonSide: vi.fn(),
}));

import { GET } from "./route";
import { auth } from "@/app/lib/auth";
import {
  areLocationsSavedByUser,
  getComparisonSide,
} from "@/app/lib/services/searchStore";

const getSession = vi.mocked(auth.api.getSession);
const checkSaved = vi.mocked(areLocationsSavedByUser);
const getSide = vi.mocked(getComparisonSide);

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

function signedInAs(userId: string): Session {
  return { user: { id: userId } } as unknown as Session;
}

function request(query = "a=location-1&b=location-2&profile=carFree") {
  return new Request(`http://test/api/compare?${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/compare", () => {
  it("rejects an unsupported mobility profile", async () => {
    const response = await GET(request("a=location-1&b=location-2&profile=fast"));

    expect(response.status).toBe(400);
    expect(getSession).not.toHaveBeenCalled();
  });

  it("requires a signed-in user", async () => {
    getSession.mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(checkSaved).not.toHaveBeenCalled();
  });

  it("requires both locations to be saved by the caller", async () => {
    getSession.mockResolvedValue(signedInAs("user-1"));
    checkSaved.mockResolvedValue(false);

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(checkSaved).toHaveBeenCalledWith("user-1", [
      "location-1",
      "location-2",
    ]);
    expect(getSide).not.toHaveBeenCalled();
  });

  it("loads both sides with the same selected profile", async () => {
    const sideA = { id: "location-1" } as Awaited<ReturnType<typeof getComparisonSide>>;
    const sideB = { id: "location-2" } as Awaited<ReturnType<typeof getComparisonSide>>;
    getSession.mockResolvedValue(signedInAs("user-1"));
    checkSaved.mockResolvedValue(true);
    getSide.mockResolvedValueOnce(sideA).mockResolvedValueOnce(sideB);

    const response = await GET(
      request("a=location-1&b=location-2&profile=carOwner"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(getSide).toHaveBeenNthCalledWith(1, "location-1", "carOwner");
    expect(getSide).toHaveBeenNthCalledWith(2, "location-2", "carOwner");
  });
});
