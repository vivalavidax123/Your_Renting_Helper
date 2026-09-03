import { describe, expect, it } from "vitest";
import { readApiResult, readTextStream } from "./api";

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

describe("readTextStream", () => {
  it("reports the accumulated text as chunks arrive", async () => {
    const encoder = new TextEncoder();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode("First "));
          controller.enqueue(encoder.encode("second"));
          controller.close();
        },
      }),
    );
    const updates: string[] = [];

    await expect(
      readTextStream(response, (text) => updates.push(text)),
    ).resolves.toBe("First second");
    expect(updates).toEqual(["First ", "First second"]);
  });

  it("rejects an empty stream", async () => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
    );

    await expect(readTextStream(response, () => {})).rejects.toThrow(
      "empty response",
    );
  });
});
