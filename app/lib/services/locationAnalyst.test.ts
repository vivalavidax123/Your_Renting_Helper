import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { analyzeLocation } from "./locationAnalyst";
import type { LocationAnalysisContext } from "./locationAnalysis";

const context: LocationAnalysisContext = {
  propertyId: "location-1",
  address: "1 Test Street, Melbourne VIC",
  suburb: null,
  overallScore: 72,
  scoreBreakdown: [],
  nearbyAmenities: [],
  preferences: { mobilityProfile: "carFree" },
  dataAsOf: "2026-08-30T00:00:00.000Z",
};

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_MODEL", "gpt-5-mini");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("analyzeLocation", () => {
  it("sends grounded application context and returns the model text", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        output: [
          {
            type: "message",
            content: [
              { type: "output_text", text: "The transport data is strong." },
            ],
          },
        ],
      }),
    );

    await expect(
      analyzeLocation(context, "Is this suitable without a car?"),
    ).resolves.toBe("The transport data is strong.");

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));

    expect(init).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
      },
    });
    expect(body).toMatchObject({
      model: "gpt-5-mini",
      max_output_tokens: 1200,
      reasoning: { effort: "minimal" },
      store: false,
    });
    expect(body.instructions).toContain("only the structured location data");
    expect(body.instructions).toContain("does not currently have");
    expect(body.instructions).toContain("Do not offer to search");
    expect(body.instructions).toContain("never exceed 180 words");
    expect(body.input).toContain("1 Test Street, Melbourne VIC");
    expect(body.input).toContain("Is this suitable without a car?");
  });

  it("fails before making a request when configuration is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(analyzeLocation(context, "Why this score?")).rejects.toEqual(
      expect.objectContaining({
        message: "AI location analysis is not configured.",
        status: 500,
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a safe error when OpenAI rejects the request", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("unauthorised", { status: 401 }),
    );

    await expect(analyzeLocation(context, "Why this score?")).rejects.toEqual(
      expect.objectContaining({
        message: "The AI service is temporarily unavailable. Please try again.",
        status: 502,
      }),
    );
  });

  it("rejects a successful response that contains no answer text", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ output: [] }),
    );

    await expect(analyzeLocation(context, "Why this score?")).rejects.toEqual(
      expect.objectContaining({ status: 502 }),
    );
  });

  it("rejects incomplete text instead of showing a partial answer", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        status: "incomplete",
        output: [
          {
            content: [{ type: "output_text", text: "A cut-off answer" }],
          },
        ],
      }),
    );

    await expect(analyzeLocation(context, "Why this score?")).rejects.toEqual(
      expect.objectContaining({
        message: "The AI service returned an incomplete answer. Please try again.",
        status: 502,
      }),
    );
  });
});
