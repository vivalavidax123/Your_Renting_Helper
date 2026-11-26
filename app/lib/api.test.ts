import { describe, expect, it } from "vitest";
import { readAnalystStream, readApiResult } from "./api";

const hasItems = (value: Record<string, unknown>) => Array.isArray(value.items);

describe("readApiResult", () => {
  it("returns a validated success payload", async () => {
    const response = Response.json({ ok: true, items: ["one"] });

    await expect(
      readApiResult<{ items: string[] }>(response, hasItems),
    ).resolves.toEqual({ ok: true, items: ["one"] });
  });

  it("preserves a valid API error", async () => {
    const response = Response.json({
      ok: false,
      error: "Not found",
      status: "ZERO_RESULTS",
    });

    await expect(
      readApiResult<{ items: string[] }>(response, hasItems),
    ).resolves.toEqual({
      ok: false,
      error: "Not found",
      status: "ZERO_RESULTS",
    });
  });

  it("rejects a success response with an invalid payload", async () => {
    const response = Response.json({ ok: true, items: "not-an-array" });

    await expect(
      readApiResult<{ items: string[] }>(response, hasItems),
    ).rejects.toThrow("incomplete data");
  });
});

function streamOf(...chunks: string[]) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
  );
}

describe("readAnalystStream", () => {
  it("joins text events and collects steps, even when lines split across chunks", async () => {
    const updates: string[] = [];
    const response = streamOf(
      '{"type":"step","name":"get_terrain","label":"the local terrain","ok":true}\n{"type":"te',
      'xt","text":"First "}\n',
      '{"type":"text","text":"second"}',
    );

    await expect(
      readAnalystStream(response, ({ text }) => updates.push(text)),
    ).resolves.toEqual({
      text: "First second",
      steps: [{ name: "get_terrain", label: "the local terrain", ok: true }],
    });
    expect(updates).toEqual(["", "First ", "First second"]);
  });

  it("throws the message of an error event", async () => {
    const response = streamOf(
      '{"type":"text","text":"Partial"}\n',
      '{"type":"error","message":"The AI service took too long. Please try again."}\n',
    );

    await expect(readAnalystStream(response, () => {})).rejects.toThrow(
      "The AI service took too long. Please try again.",
    );
  });

  it("rejects an empty stream and a non-JSON stream", async () => {
    await expect(readAnalystStream(streamOf(), () => {})).rejects.toThrow(
      "empty response",
    );
    await expect(
      readAnalystStream(streamOf("plain text\n"), () => {}),
    ).rejects.toThrow("invalid response");
  });
});
