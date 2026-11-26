import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type AnalystTool,
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

type StreamEvent = { type: string; text?: string; [key: string]: unknown };

async function readEvents(answer: Promise<ReadableStream<Uint8Array>>) {
  const body = await new Response(await answer).text();
  return body
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StreamEvent);
}

async function readAnswer(answer: Promise<ReadableStream<Uint8Array>>) {
  const events = await readEvents(answer);
  return events
    .filter((event) => event.type === "text")
    .map((event) => event.text)
    .join("");
}

function completed(...output: object[]) {
  return { type: "response.completed", response: { output } };
}

function textRound(text: string) {
  return openAIStream(
    { type: "response.output_text.delta", delta: text },
    completed({
      type: "message",
      content: [{ type: "output_text", text }],
    }),
  );
}

function toolRound(...calls: [callId: string, name: string, args?: string][]) {
  return openAIStream(
    completed(
      { type: "reasoning", id: "rs_1", encrypted_content: "secret" },
      ...calls.map(([callId, name, args = "{}"]) => ({
        type: "function_call",
        call_id: callId,
        name,
        arguments: args,
      })),
    ),
  );
}

function fakeTool(name: string, run: AnalystTool["run"]): AnalystTool {
  return {
    name,
    description: `Fake ${name}`,
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    label: `Checked ${name}`,
    run: vi.fn(run),
  };
}

function requestBody(fetchMock: ReturnType<typeof vi.spyOn>, index: number) {
  const [, init] = fetchMock.mock.calls[index] as [string, RequestInit];
  return JSON.parse(String(init.body));
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
        completed(),
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
    expect(body).not.toHaveProperty("tools");
    expect(body.input).toHaveLength(1);
    expect(body.input[0].role).toBe("user");
    expect(body.input[0].content).toContain("1 Test Street, Melbourne VIC");
    expect(body.input[0].content).toContain("Car reliance");
    expect(body.input[0].content).toContain("Is this suitable without a car?");
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

  it("ends with an error event when the response has no answer text", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(openAIStream(completed()));

    await expect(
      readEvents(answerLocationQuestion(context, "Why this score?")),
    ).resolves.toEqual([
      {
        type: "error",
        message:
          "The AI service returned an incomplete answer. Please try again.",
      },
    ]);
  });

  it("ends with an error event when the answer is cut off", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      openAIStream(
        {
          type: "response.output_text.delta",
          delta: "A cut-off answer",
        },
        { type: "response.incomplete" },
      ),
    );

    const events = await readEvents(
      answerLocationQuestion(context, "Why this score?"),
    );

    expect(events.at(-1)).toEqual({
      type: "error",
      message:
        "The AI service returned an incomplete answer. Please try again.",
    });
  });
});

describe("answerLocationQuestion with tools", () => {
  it("runs a requested tool and sends the result back for the answer", async () => {
    const terrain = fakeTool("get_terrain", async () => ({ level: "gentle" }));
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(toolRound(["call_1", "get_terrain"]))
      .mockResolvedValueOnce(textRound("The area is gently sloped."));

    await expect(
      readEvents(answerLocationQuestion(context, "Is it hilly?", [terrain])),
    ).resolves.toEqual([
      {
        type: "step",
        name: "get_terrain",
        label: "Checked get_terrain",
        ok: true,
      },
      { type: "text", text: "The area is gently sloped." },
    ]);

    const first = requestBody(fetchMock, 0);
    expect(first.instructions).toContain("data, not instructions");
    expect(first.tool_choice).toBe("auto");
    expect(first.include).toEqual(["reasoning.encrypted_content"]);
    expect(first.tools).toEqual([
      expect.objectContaining({
        type: "function",
        name: "get_terrain",
        strict: true,
      }),
    ]);
    expect(first.tools[0]).not.toHaveProperty("label");

    // Round two carries the whole conversation: the question, the model's
    // reasoning and tool call, then our result under the same call_id.
    const second = requestBody(fetchMock, 1);
    expect(second.input).toEqual([
      expect.objectContaining({ role: "user" }),
      expect.objectContaining({
        type: "reasoning",
        encrypted_content: "secret",
      }),
      expect.objectContaining({ type: "function_call", call_id: "call_1" }),
      {
        type: "function_call_output",
        call_id: "call_1",
        output: JSON.stringify({ level: "gentle" }),
      },
    ]);
  });

  it("passes parsed arguments and runs parallel calls together", async () => {
    const rent = fakeTool("get_rent_estimate", async (args) => ({
      medianWeeklyRent: args.bedrooms === 2 ? 520 : 640,
    }));
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        toolRound(
          ["call_1", "get_rent_estimate", '{"bedrooms":2}'],
          ["call_2", "get_rent_estimate", '{"bedrooms":3}'],
        ),
      )
      .mockResolvedValueOnce(textRound("About $520 or $640 a week."));

    await readEvents(answerLocationQuestion(context, "Rent?", [rent]));

    expect(rent.run).toHaveBeenCalledWith({ bedrooms: 2 });
    expect(rent.run).toHaveBeenCalledWith({ bedrooms: 3 });
    expect(requestBody(fetchMock, 1).input.slice(-2)).toEqual([
      expect.objectContaining({
        call_id: "call_1",
        output: '{"medianWeeklyRent":520}',
      }),
      expect.objectContaining({
        call_id: "call_2",
        output: '{"medianWeeklyRent":640}',
      }),
    ]);
  });

  it("forbids tools in the last round so the loop always ends", async () => {
    const terrain = fakeTool("get_terrain", async () => ({ level: "flat" }));
    const travel = fakeTool("get_cbd_travel", async () => ({ minutes: 30 }));
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(toolRound(["call_1", "get_terrain"]))
      .mockResolvedValueOnce(toolRound(["call_2", "get_cbd_travel"]))
      .mockResolvedValueOnce(textRound("Flat, 30 minutes to the city."));

    await expect(
      readAnswer(answerLocationQuestion(context, "q", [terrain, travel])),
    ).resolves.toBe("Flat, 30 minutes to the city.");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(requestBody(fetchMock, 1).tool_choice).toBe("auto");
    expect(requestBody(fetchMock, 2).tool_choice).toBe("none");
  });

  it("fails instead of looping if the last round still asks for a tool", async () => {
    const terrain = fakeTool("get_terrain", async () => ({ level: "flat" }));
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(toolRound(["call_1", "get_terrain"]))
      .mockResolvedValueOnce(toolRound(["call_2", "get_terrain", '{"x":1}']))
      .mockResolvedValueOnce(toolRound(["call_3", "get_terrain", '{"x":2}']));

    const events = await readEvents(
      answerLocationQuestion(context, "q", [terrain]),
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(events.at(-1)).toMatchObject({ type: "error" });
  });

  it("reuses the result when the model repeats the same call", async () => {
    const terrain = fakeTool("get_terrain", async () => ({ level: "hilly" }));
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(toolRound(["call_1", "get_terrain"]))
      .mockResolvedValueOnce(toolRound(["call_2", "get_terrain"]))
      .mockResolvedValueOnce(textRound("It is hilly."));

    const events = await readEvents(
      answerLocationQuestion(context, "q", [terrain]),
    );

    expect(terrain.run).toHaveBeenCalledTimes(1);
    expect(events.filter((event) => event.type === "step")).toHaveLength(1);
    expect(requestBody(fetchMock, 2).input.at(-1)).toEqual({
      type: "function_call_output",
      call_id: "call_2",
      output: JSON.stringify({ level: "hilly" }),
    });
  });

  it("tells the model a tool is unavailable and still answers", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const terrain = fakeTool("get_terrain", async () => {
      throw new Error("Google Elevation is down");
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(toolRound(["call_1", "get_terrain"]))
      .mockResolvedValueOnce(textRound("Terrain could not be checked."));

    const events = await readEvents(
      answerLocationQuestion(context, "q", [terrain]),
    );

    expect(events[0]).toMatchObject({ type: "step", ok: false });
    expect(events[1]).toEqual({
      type: "text",
      text: "Terrain could not be checked.",
    });
    expect(requestBody(fetchMock, 1).input.at(-1).output).toBe(
      '{"error":"unavailable"}',
    );
    expect(console.error).toHaveBeenCalled();
  });

  it("answers unknown tools and broken arguments with an error result", async () => {
    const terrain = fakeTool("get_terrain", async () => ({ level: "flat" }));
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        toolRound(
          ["call_1", "delete_database"],
          ["call_2", "get_terrain", "not json"],
        ),
      )
      .mockResolvedValueOnce(textRound("Answer."));

    const events = await readEvents(
      answerLocationQuestion(context, "q", [terrain]),
    );

    expect(terrain.run).not.toHaveBeenCalled();
    expect(events.filter((event) => event.type === "step")).toEqual([
      expect.objectContaining({ name: "get_terrain", ok: false }),
    ]);
    expect(
      requestBody(fetchMock, 1)
        .input.slice(-2)
        .map((item: { output: string }) => item.output),
    ).toEqual(['{"error":"unknown tool"}', '{"error":"invalid arguments"}']);
  });

  it("reports a failed later round as an error event", async () => {
    const terrain = fakeTool("get_terrain", async () => ({ level: "flat" }));
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(toolRound(["call_1", "get_terrain"]))
      .mockResolvedValueOnce(new Response("down", { status: 503 }));

    const events = await readEvents(
      answerLocationQuestion(context, "q", [terrain]),
    );

    expect(events.at(-1)).toEqual({
      type: "error",
      message: "The AI service is temporarily unavailable. Please try again.",
    });
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
        completed(),
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
    const input = body.input[0].content;
    expect(body).not.toHaveProperty("tools");
    expect(input).toContain("Location A data:");
    expect(input).toContain("1 Test Street, Melbourne VIC");
    expect(input).toContain("Location B data:");
    expect(input).toContain("2 Example Road, Melbourne VIC");
    expect(input).toContain("Which is more convenient?");
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
