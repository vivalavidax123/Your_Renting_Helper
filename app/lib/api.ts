import type { ApiResult } from "./types";

type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// A failed API response for visitors. Anything internal (database errors,
// provider messages, missing key names) goes to the server log through
// logDetails; the browser only ever receives the fixed, friendly message.
export function errorResponse(
  status: number,
  message: string,
  ...logDetails: unknown[]
) {
  if (logDetails.length > 0) {
    console.error(...logDetails);
  }

  return Response.json({ ok: false, error: message }, { status });
}

// The text to show a visitor for a caught browser-side error. Errors this app
// throws itself (including readApiResult's) carry friendly messages; fetch
// network failures (TypeError: "Failed to fetch") and broken JSON
// (SyntaxError) do not, so those fall back to the caller's message.
export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error &&
    !(error instanceof TypeError) &&
    !(error instanceof SyntaxError)
    ? error.message
    : fallback;
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
