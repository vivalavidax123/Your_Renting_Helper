"use client";
import { useConversation } from "./ConversationProvider";


import type { WeightProfile } from "@/app/lib/categories";

import type { RequestState } from "@/app/lib/types";

const suggestedQuestions = [
  "Why did this location get this score?",
  "What would day-to-day life be like here?",
  "How easy would errands be without a car?",
  "What are the biggest trade-offs?",
  "What should I verify before renting here?",
];


export function LocationAnalyst({
  propertyId,
  profile,
  placesState,
}: {
  propertyId: string | null;
  profile: WeightProfile;
  placesState: RequestState;
}) {
  const available = placesState === "success" && propertyId !== null;
  const { messages, question, setQuestion, status, error, askQuestion, clearConversation } = useConversation(
    "location:" + propertyId, "/api/locations/" + propertyId + "/chat", profile, available);

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
    status === "loading" && !messages.at(-1)?.content;

  return (
    <section className="mt-6 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="text-base font-semibold text-ink">
            Ask about this location
          </h2>
          <p className="text-xs leading-5 text-ink-muted">
            Each answer uses this question and the location evidence. Earlier messages are not sent to the AI.
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
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`min-w-0 max-w-[90%] rounded-lg px-3 py-2 text-sm leading-6 whitespace-pre-wrap break-words ${
                    message.role === "user"
                      ? "bg-action text-action-ink"
                      : "border border-line bg-surface text-ink-soft"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <p className="mb-1 text-xs text-ink-muted">
                      Answered using {message.profile === "carFree" ? "No car" : "Car owner"}
                    </p>
                  ) : null}
                  {message.content}
                  {message.interrupted ? <p className="text-xs text-ink-muted">Answer interrupted. Please ask again.</p> : null}
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
            rows={2}
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

      {messages.length ? <button type="button" onClick={clearConversation} className="mt-3 text-xs text-ink-muted underline">Clear conversation</button> : null}
      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestedQuestions.slice(0, 2).map((suggestion) => (
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
