import { describe, expect, it } from "vitest";
import { readApiResult } from "./api";

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
