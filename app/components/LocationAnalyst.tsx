"use client";

import { useEffect, useRef, useState } from "react";
import type { WeightProfile } from "@/app/lib/categories";
import { readApiResult } from "@/app/lib/api";
import type { RequestState } from "@/app/lib/types";

const suggestedQuestions = [
  "Why did this location get this score?",
  "What are the main strengths?",
  "What are the main weaknesses?",
  "Is this location good without a car?",
  "What amenities are nearby?",
];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function isChatPayload(value: Record<string, unknown>) {
  return (
    typeof value.answer === "string" && typeof value.propertyId === "string"
  );
}

export function LocationAnalyst({
  propertyId,
  profile,
  placesState,
}: {
  propertyId: string | null;
  profile: WeightProfile;
  placesState: RequestState;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const available = placesState === "success" && propertyId !== null;

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  async function askQuestion(rawQuestion: string) {
    const trimmedQuestion = rawQuestion.trim();

    if (!available || !trimmedQuestion || status === "loading") {
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setMessages((current) => [
      ...current,
      { role: "user", content: trimmedQuestion },
    ]);
    setQuestion("");
    setError("");
    setStatus("loading");

    try {
      const response = await fetch(`/api/locations/${propertyId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion, profile }),
        signal: controller.signal,
      });
      const data = await readApiResult<{
        answer: string;
        propertyId: string;
      }>(response, isChatPayload);

      if (!response.ok || !data.ok) {
        setError(data.ok ? "Could not analyse this location." : data.error);
        return;
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer },
      ]);
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === "AbortError") {
        return;
      }

      setError("The location analyst could not be reached. Please try again.");
    } finally {
      if (!controller.signal.aborted) {
        setStatus("idle");
        controllerRef.current = null;
      }
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askQuestion(question);
  }

  const unavailableMessage =
    placesState === "success" && propertyId === null
      ? "This result could not be saved, so grounded analysis is unavailable. Search again to retry."
      : "Search for a location before asking the analyst.";

  return (
    <section className="mt-6 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Ask about this location
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">
            Answers use the score and nearby amenities shown here. Your
            question and a compact location summary are sent to OpenAI.
          </p>
        </div>
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">
          AI analyst
        </span>
      </div>

      <div
        className="mt-4 max-h-80 min-h-32 space-y-3 overflow-y-auto rounded-lg border border-line bg-surface-subtle p-3"
        aria-live="polite"
      >
        {messages.length === 0 && status !== "loading" ? (
          <p className="text-sm leading-6 text-ink-muted">
            {available
              ? "Choose a suggested question or ask your own."
              : unavailableMessage}
          </p>
        ) : null}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`min-w-0 max-w-[90%] rounded-lg px-3 py-2 text-sm leading-6 whitespace-pre-wrap break-words ${
                message.role === "user"
                  ? "bg-action text-action-ink"
                  : "border border-line bg-surface text-ink-soft"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {status === "loading" ? (
          <p className="w-fit rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-muted">
            Analysing this location...
          </p>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestedQuestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => void askQuestion(suggestion)}
            disabled={!available || status === "loading"}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-line-strong hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <label htmlFor="location-analyst-question" className="sr-only">
          Ask about this location
        </label>
        <input
          id="location-analyst-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={1000}
          disabled={!available || status === "loading"}
          placeholder={available ? "Ask about the score or amenities..." : "Search first"}
          className="min-w-0 flex-1 rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent-ring disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!available || !question.trim() || status === "loading"}
          className="rounded-md bg-action px-4 py-2 text-sm font-semibold text-action-ink transition hover:bg-action-hover disabled:cursor-not-allowed disabled:bg-action-disabled"
        >
          Send
        </button>
      </form>
    </section>
  );
}
