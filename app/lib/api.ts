import type { ApiResult } from "./types";

type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readApiResult<T extends object>(
  response: Response,
  isSuccessPayload: (value: JsonRecord) => boolean,
): Promise<ApiResult<T>> {
  const value: unknown = await response.json();

  if (!isJsonRecord(value) || typeof value.ok !== "boolean") {
    throw new Error("The server returned an invalid response.");
  }

  if (!value.ok) {
    if (typeof value.error !== "string") {
      throw new Error("The server returned an invalid error response.");
    }

    return {
      ok: false,
      error: value.error,
      ...(typeof value.status === "string" ? { status: value.status } : {}),
    };
  }

  if (!isSuccessPayload(value)) {
    throw new Error("The server returned incomplete data.");
  }

  return value as { ok: true } & T;
}

export async function readTextStream(
  response: Response,
  onText: (text: string) => void,
) {
  if (!response.body) {
    throw new Error("The server returned an empty response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      const remaining = decoder.decode();

      if (remaining) {
        text += remaining;
        onText(text);
      }
      break;
    }

    text += decoder.decode(value, { stream: true });
    onText(text);
  }

  if (!text.trim()) {
    throw new Error("The server returned an empty response.");
  }

  return text;
}
