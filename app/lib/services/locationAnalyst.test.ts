import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  answerLocationQuestion,
  answerComparisonQuestion,
  getQuestionRefusal,
  isLocationQuestionInScope,
  isLocationQuestionSafe,
  readQuestion,
} from "./locationAnalyst";
import type { LocationAnalysisContext } from "./locationAnalysis";

function openAIStream(...events: object[]) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const event of events) {
          const message = encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
          const midpoint = Math.ceil(message.length / 2);
          controller.enqueue(message.slice(0, midpoint));
          controller.enqueue(message.slice(midpoint));
        }
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}

async function readAnswer(answer: Promise<ReadableStream<Uint8Array>>) {
  return new Response(await answer).text();
}

const context: LocationAnalysisContext = {
  locationId: "location-1",
  address: "1 Test Street, Melbourne VIC",
  suburb: null,
  overallScore: 72,
  scoreBreakdown: [],
  nearbyAmenities: [],
  practicalIndicators: [
    {
      label: "Car reliance",
      value: "Lower",
      detail: "0 core categories likely need a longer walk or drive",
    },
  ],
  preferences: { mobilityProfile: "carFree", weightPreset: "balanced" },
  dataAsOf: "2026-08-30T00:00:00.000Z",
};

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_MODEL", "gpt-5.6-terra");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("answerLocationQuestion", () => {
  it("sends grounded application context and returns the model text", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      openAIStream(
        {
          type: "response.output_text.delta",
          delta: "The transport data ",
        },
        { type: "response.output_text.delta", delta: "is strong." },
        { type: "response.completed" },
      ),
    );

    await expect(
      readAnswer(
        answerLocationQuestion(context, "Is this suitable without a car?"),
      ),
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
      model: "gpt-5.6-terra",
      max_output_tokens: 1200,
      reasoning: { effort: "xhigh" },
      text: { verbosity: "high" },
      store: false,
      stream: true,
    });
    expect(body.instructions).toContain("only the structured location data");
    expect(body.instructions).toContain("picture day-to-day life");
    expect(body.instructions).toContain("Do not merely repeat");
    expect(body.instructions).toContain("practical implication");
    expect(body.instructions).toContain("never exceed 220 words");
    expect(body.input).toContain("1 Test Street, Melbourne VIC");
    expect(body.input).toContain("Car reliance");
    expect(body.input).toContain("Is this suitable without a car?");
  });

  it("fails before making a request when configuration is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      answerLocationQuestion(context, "Why this score?"),
    ).rejects.toEqual(
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

    await expect(
      answerLocationQuestion(context, "Why this score?"),
    ).rejects.toEqual(
      expect.objectContaining({
        message: "The AI service is temporarily unavailable. Please try again.",
        status: 502,
      }),
    );
  });

  it("rejects a successful response that contains no answer text", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(openAIStream());

    await expect(
      readAnswer(answerLocationQuestion(context, "Why this score?")),
    ).rejects.toEqual(expect.objectContaining({ status: 502 }));
  });

  it("rejects incomplete text instead of showing a partial answer", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      openAIStream(
        {
          type: "response.output_text.delta",
          delta: "A cut-off answer",
        },
        { type: "response.incomplete" },
      ),
    );

    await expect(
      readAnswer(answerLocationQuestion(context, "Why this score?")),
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "The AI service returned an incomplete answer. Please try again.",
        status: 502,
      }),
    );
  });
});

describe("answerComparisonQuestion", () => {
  it("labels both contexts and asks for a practical, conditional comparison", async () => {
    const secondContext: LocationAnalysisContext = {
      ...context,
      locationId: "location-2",
      address: "2 Example Road, Melbourne VIC",
      overallScore: 81,
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      openAIStream(
        {
          type: "response.output_text.delta",
          delta: "Location B is more convenient for daily errands.",
        },
        { type: "response.completed" },
      ),
    );

    await expect(
      readAnswer(
        answerComparisonQuestion(
          context,
          secondContext,
          "Which is more convenient?",
        ),
      ),
    ).resolves.toBe("Location B is more convenient for daily errands.");

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));

    expect(body.instructions).toContain(
      "comparing exactly two rental locations",
    );
    expect(body.instructions).toContain("conditional recommendation");
    expect(body.input).toContain("Location A data:");
    expect(body.input).toContain("1 Test Street, Melbourne VIC");
    expect(body.input).toContain("Location B data:");
    expect(body.input).toContain("2 Example Road, Melbourne VIC");
    expect(body.input).toContain("Which is more convenient?");
  });
});

describe("isLocationQuestionSafe", () => {
  it("returns false when moderation flags the question", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ results: [{ flagged: true }] }),
    );

    await expect(isLocationQuestionSafe("question")).resolves.toBe(false);
  });

  it("returns true for an unflagged question", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ results: [{ flagged: false }] }),
    );

    await expect(isLocationQuestionSafe("question")).resolves.toBe(true);
  });

  it("maps provider failures to friendly errors with a status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("down", { status: 503 }),
    );
    await expect(isLocationQuestionSafe("question")).rejects.toMatchObject({
      status: 502,
      message:
        "The AI safety check is temporarily unavailable. Please try again.",
    });

    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(timeout);
    await expect(isLocationQuestionSafe("question")).rejects.toMatchObject({
      status: 504,
      message: "The AI safety check took too long. Please try again.",
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ results: [] }),
    );
    await expect(isLocationQuestionSafe("question")).rejects.toMatchObject({
      status: 502,
      message:
        "The AI safety check returned an invalid response. Please try again.",
    });
  });
});

describe("isLocationQuestionInScope", () => {
  function classification(decision: string) {
    return Response.json({
      output: [
        {
          content: [
            { type: "output_text", text: JSON.stringify({ decision }) },
          ],
        },
      ],
    });
  }

  it("reads the allow or reject decision", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      classification("allow"),
    );
    await expect(isLocationQuestionInScope("q", "single")).resolves.toBe(true);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      classification("reject"),
    );
    await expect(isLocationQuestionInScope("q", "comparison")).resolves.toBe(
      false,
    );
  });

  it("rejects an unexpected decision and provider failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      classification("maybe"),
    );
    await expect(
      isLocationQuestionInScope("q", "single"),
    ).rejects.toMatchObject({
      status: 502,
      message:
        "The AI scope check returned an invalid response. Please try again.",
    });

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("down"));
    await expect(
      isLocationQuestionInScope("q", "single"),
    ).rejects.toMatchObject({
      status: 502,
      message:
        "The AI scope check is temporarily unavailable. Please try again.",
    });
  });
});

describe("readQuestion", () => {
  it("trims the question and rejects empty or overlong text", () => {
    expect(readQuestion("  Is it quiet?  ")).toEqual({
      question: "Is it quiet?",
    });
    expect(readQuestion("   ")).toEqual({ error: "Question is required." });
    expect(readQuestion(42)).toEqual({ error: "Question is required." });
    expect(readQuestion("a".repeat(1_001))).toEqual({
      error: "Question must be 1,000 characters or fewer.",
    });
  });
});

describe("getQuestionRefusal", () => {
  function scopeDecision(decision: string) {
    return Response.json({
      output: [
        {
          content: [
            { type: "output_text", text: JSON.stringify({ decision }) },
          ],
        },
      ],
    });
  }

  it("refuses a flagged question without running the scope check", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ results: [{ flagged: true }] }));

    await expect(getQuestionRefusal("q", "single")).resolves.toBe(
      "I can’t help with that request. Ask about the selected location or renting instead.",
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("refuses an off-topic question and allows an on-topic one", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ results: [{ flagged: false }] }))
      .mockResolvedValueOnce(scopeDecision("reject"))
      .mockResolvedValueOnce(Response.json({ results: [{ flagged: false }] }))
      .mockResolvedValueOnce(scopeDecision("allow"));

    await expect(getQuestionRefusal("q", "comparison")).resolves.toBe(
      "I can only answer questions about the selected locations, nearby amenities, transport, rental evidence, and renting trade-offs.",
    );
    await expect(getQuestionRefusal("q", "comparison")).resolves.toBeNull();
  });
});
