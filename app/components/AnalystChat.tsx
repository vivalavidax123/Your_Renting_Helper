"use client";

import type { FormEvent, KeyboardEvent } from "react";
import type { UseConversationOptions } from "./ConversationProvider";
import { useConversation } from "./ConversationProvider";

type AnalystChatProps = UseConversationOptions & {
  title: string;
  inputId: string;
  placeholder: string;
  unavailablePlaceholder: string;
  pendingLabel: string;
  suggestions: readonly string[];
  formMarginClassName: "mt-3" | "mt-4";
};

export function AnalystChat({
  conversationKey,
  endpoint,
  profile,
  preset,
  available,
  locationIds,
  title,
  inputId,
  placeholder,
  unavailablePlaceholder,
  pendingLabel,
  suggestions,
  formMarginClassName,
}: AnalystChatProps) {
  const {
    messages,
    question,
    setQuestion,
    status,
    error,
    askQuestion,
    clearConversation,
  } = useConversation({
    conversationKey,
    endpoint,
    profile,
    preset,
    available,
    locationIds,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askQuestion(question);
  }

  function handleQuestionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void askQuestion(question);
    }
  }

  const awaitingFirstChunk = status === "loading" && !messages.at(-1)?.content;

  return (
    <section className="mt-6 border-t border-line pt-5">
      <h2 className="text-base font-semibold text-ink">{title}</h2>

      <form
        onSubmit={handleSubmit}
        className={`${formMarginClassName} overflow-hidden rounded-lg border border-line bg-surface-subtle focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-ring`}
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
                      Answered using{" "}
                      {message.profile === "carFree" ? "No car" : "Car owner"}
                    </p>
                  ) : null}
                  {message.content}
                  {message.interrupted ? (
                    <p className="text-xs text-ink-muted">
                      Answer interrupted. Please ask again.
                    </p>
                  ) : null}
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
                {pendingLabel}
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          className={`relative ${messages.length > 0 || status === "loading" ? "border-t border-line" : ""}`}
        >
          <label htmlFor={inputId} className="sr-only">
            {title}
          </label>
          <textarea
            id={inputId}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            maxLength={1000}
            rows={2}
            disabled={!available || status === "loading"}
            placeholder={available ? placeholder : unavailablePlaceholder}
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

      {messages.length ? (
        <button
          type="button"
          onClick={clearConversation}
          className="mt-3 text-xs text-ink-muted underline"
        >
          Clear conversation
        </button>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
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
