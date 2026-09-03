"use client";

import { useEffect, useRef, useState } from "react";
import type { WeightProfile } from "@/app/lib/categories";
import { readApiResult, readTextStream } from "@/app/lib/api";
import type { RequestState } from "@/app/lib/types";

const suggestedQuestions = [
  "Why did this location get this score?",
  "What would day-to-day life be like here?",
  "How easy would errands be without a car?",
  "What are the biggest trade-offs?",
  "What should I verify before renting here?",
];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

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
    let assistantStarted = false;

    try {
      const response = await fetch(`/api/locations/${propertyId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion, profile }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await readApiResult<Record<string, never>>(
          response,
          () => true,
        );
        setError(data.ok ? "Could not analyse this location." : data.error);
        return;
      }

      assistantStarted = true;
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "" },
      ]);
      await readTextStream(response, (answer) => {
        setMessages((current) => [
          ...current.slice(0, -1),
          { role: "assistant", content: answer },
        ]);
      });
    } catch (requestError) {
      if (requestError instanceof Error && requestError.name === "AbortError") {
        return;
      }

      if (assistantStarted) {
        setMessages((current) => current.slice(0, -1));
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

  function handleQuestionKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void askQuestion(question);
    }
  }

  const unavailableMessage =
    placesState === "success" && propertyId === null
      ? "This result could not be saved, so grounded analysis is unavailable. Search again to retry."
      : "Search for a location before asking the analyst.";
  const awaitingFirstChunk =
    status === "loading" && messages.at(-1)?.role !== "assistant";

  return (
    <section className="mt-6 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="text-base font-semibold text-ink">
            Ask about this location
          </h2>
          <p className="text-xs leading-5 text-ink-muted">
            (Answers use the score and nearby amenities shown here.)
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 overflow-hidden rounded-lg border border-line bg-surface-subtle focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-ring"
      >
        {messages.length > 0 || status === "loading" ? (
          <div
            className="max-h-64 space-y-3 overflow-y-auto p-3"
            aria-live="polite"
          >
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
                  {status === "loading" &&
                  message.role === "assistant" &&
                  index === messages.length - 1 ? (
                    <span aria-hidden="true" className="animate-pulse">
                      ▍
                    </span>
                  ) : null}
                </div>
              </div>
            ))}

            {awaitingFirstChunk ? (
              <p className="w-fit rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink-muted">
                Analysing this location...
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          className={`relative ${messages.length > 0 || status === "loading" ? "border-t border-line" : ""}`}
        >
          <label htmlFor="location-analyst-question" className="sr-only">
            Ask about this location
          </label>
          <textarea
            id="location-analyst-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            maxLength={1000}
            rows={messages.length > 0 ? 2 : 5}
            disabled={!available || status === "loading"}
            placeholder={
              available
                ? "Ask about daily life, or include your commute and priorities..."
                : unavailableMessage
            }
            className="block w-full resize-none bg-transparent px-3 py-3 pr-24 text-sm leading-6 text-ink outline-none placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={!available || !question.trim() || status === "loading"}
            className="absolute right-3 bottom-3 rounded-md bg-action px-4 py-2 text-sm font-semibold text-action-ink transition hover:bg-action-hover disabled:cursor-not-allowed disabled:bg-action-disabled"
          >
            Send
          </button>
        </div>
      </form>

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
    </section>
  );
}
