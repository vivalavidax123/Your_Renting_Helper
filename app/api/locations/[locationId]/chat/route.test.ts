import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/app/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("@/app/lib/services/locationAnalysis", () => ({
  buildLocationAnalysisContext: vi.fn(),
}));
vi.mock("@/app/lib/services/locationAnalyst", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/lib/services/locationAnalyst")
  >("@/app/lib/services/locationAnalyst");

  return {
    ...actual,
    analyzeLocation: vi.fn(),
    isLocationQuestionInScope: vi.fn().mockResolvedValue(true),
    isLocationQuestionSafe: vi.fn().mockResolvedValue(true),
  };
});

import { POST } from "./route";
import { auth } from "@/app/lib/auth";
import {
  analyzeLocation,
  LocationAnalystError,
} from "@/app/lib/services/locationAnalyst";
import { buildLocationAnalysisContext } from "@/app/lib/services/locationAnalysis";

const buildContext = vi.mocked(buildLocationAnalysisContext);
const analyze = vi.mocked(analyzeLocation);
const getSession = vi.mocked(auth.api.getSession);

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

function signedInAs(userId: string): Session {
  return { user: { id: userId } } as unknown as Session;
}

function answerStream(answer: string) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(answer));
      controller.close();
    },
  });
}

function request(body: string) {
  return new Request("http://test/api/locations/location-1/chat", {
    method: "POST",
    body,
  });
}

const routeContext = {
  params: Promise.resolve({ locationId: "location-1" }),
};

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(signedInAs("user-1"));
});

describe("POST /api/locations/[locationId]/chat", () => {
  it("rejects malformed JSON", async () => {
    const response = await POST(request("not json"), routeContext);

    expect(response.status).toBe(400);
    expect(buildContext).not.toHaveBeenCalled();
  });

  it("rejects empty questions and invalid profiles", async () => {
    const emptyResponse = await POST(
      request(JSON.stringify({ question: "   " })),
      routeContext,
    );
    const profileResponse = await POST(
      request(JSON.stringify({ question: "Why?", profile: "cyclist" })),
      routeContext,
    );

    expect(emptyResponse.status).toBe(400);
    expect(profileResponse.status).toBe(400);
    expect(buildContext).not.toHaveBeenCalled();
  });

  it("requires a signed-in user", async () => {
    getSession.mockResolvedValue(null);

    const response = await POST(
      request(JSON.stringify({ question: "Why this score?" })),
      routeContext,
    );

    expect(response.status).toBe(401);
    expect(buildContext).not.toHaveBeenCalled();
  });

  it("returns 404 when stored location data is unavailable", async () => {
    buildContext.mockResolvedValue(null);

    const response = await POST(
      request(JSON.stringify({ question: "Why this score?" })),
      routeContext,
    );

    expect(response.status).toBe(404);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("builds the selected profile context and streams its answer", async () => {
    const context = { locationId: "location-1" } as Awaited<
      ReturnType<typeof buildLocationAnalysisContext>
    >;
    buildContext.mockResolvedValue(context);
    analyze.mockResolvedValue(
      answerStream("Transport is the strongest category."),
    );

    const response = await POST(
      request(
        JSON.stringify({
          question: "  Why this score?  ",
          profile: "carOwner",
        }),
      ),
      routeContext,
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(body).toBe("Transport is the strongest category.");
    expect(buildContext).toHaveBeenCalledWith("location-1", "carOwner");
    expect(analyze).toHaveBeenCalledWith(context, "Why this score?");
  });

  it("returns the analyst service's useful failure status", async () => {
    const context = { locationId: "location-1" } as Awaited<
      ReturnType<typeof buildLocationAnalysisContext>
    >;
    buildContext.mockResolvedValue(context);
    analyze.mockRejectedValue(
      new LocationAnalystError(
        "The AI service took too long to respond. Please try again.",
        504,
      ),
    );

    const response = await POST(
      request(JSON.stringify({ question: "Why this score?" })),
      routeContext,
    );
    const body = await response.json();

    expect(response.status).toBe(504);
    expect(body).toEqual({
      ok: false,
      error: "The AI service took too long to respond. Please try again.",
    });
  });
});
