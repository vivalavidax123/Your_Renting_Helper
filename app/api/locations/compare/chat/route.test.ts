import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("@/app/lib/services/locationAnalysis", () => ({
  buildLocationAnalysisContext: vi.fn(),
}));
vi.mock("@/app/lib/services/searchStore", () => ({
  areLocationsSavedByUser: vi.fn(),
}));
vi.mock("@/app/lib/services/locationAnalyst", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/lib/services/locationAnalyst")
  >("@/app/lib/services/locationAnalyst");

  return { ...actual, compareLocations: vi.fn() };
});

import { POST } from "./route";
import { auth } from "@/app/lib/auth";
import {
  compareLocations,
  LocationAnalystError,
} from "@/app/lib/services/locationAnalyst";
import { buildLocationAnalysisContext } from "@/app/lib/services/locationAnalysis";
import { areLocationsSavedByUser } from "@/app/lib/services/searchStore";

const getSession = vi.mocked(auth.api.getSession);
const checkSaved = vi.mocked(areLocationsSavedByUser);
const buildContext = vi.mocked(buildLocationAnalysisContext);
const compare = vi.mocked(compareLocations);

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

function signedInAs(userId: string): Session {
  return { user: { id: userId } } as unknown as Session;
}

function request(body: string) {
  return new Request("http://test/api/locations/compare/chat", {
    method: "POST",
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/locations/compare/chat", () => {
  it("rejects malformed JSON and invalid location pairs", async () => {
    const malformed = await POST(request("not json"));
    const duplicate = await POST(
      request(
        JSON.stringify({
          propertyIds: ["location-1", "location-1"],
          question: "Which is better?",
        }),
      ),
    );

    expect(malformed.status).toBe(400);
    expect(duplicate.status).toBe(400);
    expect(getSession).not.toHaveBeenCalled();
  });

  it("rejects empty questions and invalid profiles", async () => {
    const empty = await POST(
      request(
        JSON.stringify({
          propertyIds: ["location-1", "location-2"],
          question: "  ",
        }),
      ),
    );
    const invalidProfile = await POST(
      request(
        JSON.stringify({
          propertyIds: ["location-1", "location-2"],
          question: "Which is better?",
          profile: "cyclist",
        }),
      ),
    );

    expect(empty.status).toBe(400);
    expect(invalidProfile.status).toBe(400);
    expect(getSession).not.toHaveBeenCalled();
  });

  it("requires a signed-in user", async () => {
    getSession.mockResolvedValue(null);

    const response = await POST(
      request(
        JSON.stringify({
          propertyIds: ["location-1", "location-2"],
          question: "Which is better?",
        }),
      ),
    );

    expect(response.status).toBe(401);
    expect(checkSaved).not.toHaveBeenCalled();
  });

  it("requires both locations to be saved by the signed-in user", async () => {
    getSession.mockResolvedValue(signedInAs("user-1"));
    checkSaved.mockResolvedValue(false);

    const response = await POST(
      request(
        JSON.stringify({
          propertyIds: ["location-1", "location-2"],
          question: "Which is better?",
        }),
      ),
    );

    expect(response.status).toBe(403);
    expect(checkSaved).toHaveBeenCalledWith("user-1", [
      "location-1",
      "location-2",
    ]);
    expect(buildContext).not.toHaveBeenCalled();
  });

  it("builds both contexts with the selected profile and returns the answer", async () => {
    const contextA = { propertyId: "location-1" } as NonNullable<
      Awaited<ReturnType<typeof buildLocationAnalysisContext>>
    >;
    const contextB = { propertyId: "location-2" } as NonNullable<
      Awaited<ReturnType<typeof buildLocationAnalysisContext>>
    >;
    getSession.mockResolvedValue(signedInAs("user-1"));
    checkSaved.mockResolvedValue(true);
    buildContext
      .mockResolvedValueOnce(contextA)
      .mockResolvedValueOnce(contextB);
    compare.mockResolvedValue("Location A is easier without a car.");

    const response = await POST(
      request(
        JSON.stringify({
          propertyIds: [" location-1 ", "location-2"],
          question: "  Which is easier without a car?  ",
          profile: "carFree",
        }),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      answer: "Location A is easier without a car.",
      propertyIds: ["location-1", "location-2"],
    });
    expect(buildContext).toHaveBeenNthCalledWith(1, "location-1", "carFree");
    expect(buildContext).toHaveBeenNthCalledWith(2, "location-2", "carFree");
    expect(compare).toHaveBeenCalledWith(
      contextA,
      contextB,
      "Which is easier without a car?",
    );
  });

  it("returns 404 when either location snapshot is unavailable", async () => {
    const contextA = { propertyId: "location-1" } as NonNullable<
      Awaited<ReturnType<typeof buildLocationAnalysisContext>>
    >;
    getSession.mockResolvedValue(signedInAs("user-1"));
    checkSaved.mockResolvedValue(true);
    buildContext.mockResolvedValueOnce(contextA).mockResolvedValueOnce(null);

    const response = await POST(
      request(
        JSON.stringify({
          propertyIds: ["location-1", "location-2"],
          question: "Which is better?",
        }),
      ),
    );

    expect(response.status).toBe(404);
    expect(compare).not.toHaveBeenCalled();
  });

  it("preserves useful analyst service errors", async () => {
    const contextA = { propertyId: "location-1" } as NonNullable<
      Awaited<ReturnType<typeof buildLocationAnalysisContext>>
    >;
    const contextB = { propertyId: "location-2" } as NonNullable<
      Awaited<ReturnType<typeof buildLocationAnalysisContext>>
    >;
    getSession.mockResolvedValue(signedInAs("user-1"));
    checkSaved.mockResolvedValue(true);
    buildContext
      .mockResolvedValueOnce(contextA)
      .mockResolvedValueOnce(contextB);
    compare.mockRejectedValue(
      new LocationAnalystError(
        "The AI service took too long to respond. Please try again.",
        504,
      ),
    );

    const response = await POST(
      request(
        JSON.stringify({
          propertyIds: ["location-1", "location-2"],
          question: "Which is better?",
        }),
      ),
    );

    expect(response.status).toBe(504);
  });
});
