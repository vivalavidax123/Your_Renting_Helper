import type { AnalystEvent, AnalystStep, ApiResult } from "./types";

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

// An analyst chat answer: newline-delimited JSON (NDJSON), one AnalystEvent
// per line, streamed as it is produced. nosniff stops the browser from
// guessing a different content type, and no-cache stops proxies from holding
// back the stream.
export function analystResponse(body: BodyInit) {
  return new Response(body, {
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function encodeAnalystEvent(event: AnalystEvent) {
  return `${JSON.stringify(event)}\n`;
}

// A whole answer that is known up front, such as a refusal, as one event.
export function analystTextResponse(text: string) {
  return analystResponse(encodeAnalystEvent({ type: "text", text }));
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

function readAnalystEvent(line: string): AnalystEvent | null {
  let value: unknown;

  try {
    value = JSON.parse(line);
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!isJsonRecord(value)) {
    return null;
  }

  if (value.type === "text" && typeof value.text === "string") {
    return { type: "text", text: value.text };
  }

  if (
    value.type === "step" &&
    typeof value.name === "string" &&
    typeof value.label === "string" &&
    typeof value.ok === "boolean"
  ) {
    return {
      type: "step",
      name: value.name,
      label: value.label,
      ok: value.ok,
    };
  }

  if (value.type === "error" && typeof value.message === "string") {
    return { type: "error", message: value.message };
  }

  return null;
}

// Reads an analystResponse stream line by line. onUpdate receives the answer
// so far and the tool steps so far after each event. An error event throws
// its friendly message, so callers handle it like any failed request.
export async function readAnalystStream(
  response: Response,
  onUpdate: (answer: { text: string; steps: AnalystStep[] }) => void,
) {
  if (!response.body) {
    throw new Error("The server returned an empty response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  const steps: AnalystStep[] = [];

  function readLine(line: string) {
    const event = line.trim() ? readAnalystEvent(line) : null;

    if (!event) {
      return;
    }

    if (event.type === "error") {
      throw new Error(event.message);
    }

    if (event.type === "text") {
      text += event.text;
    } else {
      const { name, label, ok } = event;
      steps.push({ name, label, ok });
    }

    onUpdate({ text, steps: [...steps] });
  }

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      buffer += decoder.decode();
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf("\n");

    while (newline !== -1) {
      readLine(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
    }
  }

  readLine(buffer);

  if (!text.trim()) {
    throw new Error("The server returned an empty response.");
  }

  return { text, steps };
}
