"use client";

import { useEffect, useRef, useState } from "react";
import type { WeightProfile } from "../lib/categories";
import { isJsonRecord, readApiResult, readTextStream } from "../lib/api";
import type {
  ComparisonSide,
  RecentSearch,
} from "../lib/types";

function isComparisonPayload(value: Record<string, unknown>) {
  return isJsonRecord(value.a) && isJsonRecord(value.b);
}

type ComparePanelProps = {
  saved: RecentSearch[];
  profile: WeightProfile;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const suggestedComparisonQuestions = [
  "Which is easier without a car?",
  "Which has better everyday convenience?",
  "What is the biggest trade-off between them?",
  "Which better suits frequent café and gym use?",
];

type LocationSelectProps = {
  label: string;
  value: string;
  otherValue: string;
  saved: RecentSearch[];
  onChange: (id: string) => void;
};

function LocationSelect({ label, value, otherValue, saved, onChange }: LocationSelectProps) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-ink-muted">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={saved.length === 0}
        className="w-full rounded-md border border-line bg-control px-2 py-1.5 text-sm font-normal text-ink"
      >
        <option value="">
          {saved.length === 0
            ? "No saved locations yet"
            : "Choose a saved location…"}
        </option>
        {saved.map((search) => (
          <option
            key={search.id}
            value={search.id}
            disabled={search.id === otherValue}
          >
            {search.formattedAddress}
          </option>
        ))}
      </select>
    </label>
  );
}

function scoreCell(score: number, otherScore: number) {
  const isWinner = score > otherScore;

  return (
    <td
      className={`px-3 py-2 text-right tabular-nums ${
        isWinner ? "font-bold text-accent" : "text-ink-soft"
      }`}
    >
      {Math.round(score)}
    </td>
  );
}

function ComparisonAnalyst({
  locationA,
  locationB,
  profile,
}: {
  locationA: ComparisonSide;
  locationB: ComparisonSide;
  profile: WeightProfile;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  async function askQuestion(rawQuestion: string) {
    const trimmedQuestion = rawQuestion.trim();

    if (!trimmedQuestion || status === "loading") {
      return;
    }

    const propertyIds = [locationA.id, locationB.id];
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
      const response = await fetch("/api/locations/compare/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyIds, question: trimmedQuestion, profile }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await readApiResult<Record<string, never>>(
          response,
          () => true,
        );
        setError(data.ok ? "Could not compare these locations." : data.error);
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
      setError("The comparison analyst could not be reached. Please try again.");
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

  const awaitingFirstChunk =
    status === "loading" && messages.at(-1)?.role !== "assistant";

  return (
    <section className="mt-5 border-t border-line pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            Ask about these locations
          </h3>
          <p className="mt-1 text-xs leading-5 text-ink-muted">
            Answers compare the saved scores and nearby amenities for A and B.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-3 overflow-hidden rounded-lg border border-line bg-surface-subtle focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-ring"
      >
        {messages.length > 0 || status === "loading" ? (
          <div className="max-h-64 space-y-3 overflow-y-auto p-3" aria-live="polite">
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
                Comparing these locations...
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          className={`relative ${messages.length > 0 || status === "loading" ? "border-t border-line" : ""}`}
        >
          <label htmlFor="location-comparison-question" className="sr-only">
            Ask about these locations
          </label>
          <textarea
            id="location-comparison-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            maxLength={1000}
            rows={messages.length > 0 ? 2 : 4}
            disabled={status === "loading"}
            placeholder="Ask which location better fits your routines and priorities..."
            className="block w-full resize-none bg-transparent px-3 py-3 pr-24 text-sm leading-6 text-ink outline-none placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={!question.trim() || status === "loading"}
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
        {suggestedComparisonQuestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => void askQuestion(suggestion)}
            disabled={status === "loading"}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-line-strong hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </section>
  );
}

export function ComparePanel({ saved: allSaved, profile }: ComparePanelProps) {
  // Comparison needs stored scores, so only offer locations that have a
  // snapshot; scoreless favourites reappear here after being re-searched.
  const saved = allSaved.filter((search) => search.overallScore !== null);

  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [result, setResult] = useState<{ a: ComparisonSide; b: ComparisonSide } | null>(null);
  const [error, setError] = useState<{ pair: string; message: string } | null>(null);

  // Derive stale selections instead of synchronizing them in another effect.
  const effectiveAId = saved.some((search) => search.id === aId) ? aId : "";
  const effectiveBId = saved.some((search) => search.id === bId) ? bId : "";

  useEffect(() => {
    if (!effectiveAId || !effectiveBId || effectiveAId === effectiveBId) {
      return;
    }

    const pair = `${effectiveAId}|${effectiveBId}`;
    let cancelled = false;

    fetch(`/api/compare?a=${effectiveAId}&b=${effectiveBId}`)
      .then((response) =>
        readApiResult<{ a: ComparisonSide; b: ComparisonSide }>(
          response,
          isComparisonPayload,
        ),
      )
      .then((data) => {
        if (cancelled) {
          return;
        }

        if (data.ok) {
          setResult({ a: data.a, b: data.b });
          setError(null);
        } else {
          setError({ pair, message: data.error });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError({ pair, message: "Comparison failed to load. Try again." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveAId, effectiveBId]);

  const activeResult =
    result && result.a.id === effectiveAId && result.b.id === effectiveBId
      ? result
      : null;
  const activeError =
    error && error.pair === `${effectiveAId}|${effectiveBId}`
      ? error.message
      : "";

  return (
    <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Compare saved locations</h2>
      <p className="mt-1 text-xs text-ink-soft">
        Pick two saved locations to see their category scores side by side.
        The higher score in each row is highlighted.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <LocationSelect
          label="Location A"
          value={effectiveAId}
          otherValue={effectiveBId}
          saved={saved}
          onChange={setAId}
        />
        <LocationSelect
          label="Location B"
          value={effectiveBId}
          otherValue={effectiveAId}
          saved={saved}
          onChange={setBId}
        />
      </div>

      {saved.length < 2 ? (
        <p className="mt-3 text-xs leading-5 text-ink-muted">
          {saved.length === 0
            ? "Save at least two scored locations to compare them."
            : "Save one more scored location to start a comparison."}
        </p>
      ) : null}

      {activeError && <p className="mt-3 text-sm text-danger-ink">{activeError}</p>}

      {activeResult && (
        <>
          <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line-strong text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-2 text-left font-semibold">Category</th>
              <th className="max-w-40 truncate px-3 py-2 text-right font-semibold">
                {activeResult.a.formattedAddress}
              </th>
              <th className="max-w-40 truncate px-3 py-2 text-right font-semibold">
                {activeResult.b.formattedAddress}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line bg-surface font-semibold">
              <td className="px-3 py-2">Overall</td>
              {scoreCell(activeResult.a.overallScore, activeResult.b.overallScore)}
              {scoreCell(activeResult.b.overallScore, activeResult.a.overallScore)}
            </tr>
            {activeResult.a.scores.map((scoreA) => {
              const scoreB = activeResult.b.scores.find(
                (candidate) => candidate.id === scoreA.id,
              );

              if (!scoreB) {
                return null;
              }

              return (
                <tr key={scoreA.id} className="border-b border-line">
                  <td className="px-3 py-2 text-ink-soft">{scoreA.label}</td>
                  {scoreCell(scoreA.score, scoreB.score)}
                  {scoreCell(scoreB.score, scoreA.score)}
                </tr>
              );
            })}
          </tbody>
          </table>
          <ComparisonAnalyst
            key={`${activeResult.a.id}|${activeResult.b.id}|${profile}`}
            locationA={activeResult.a}
            locationB={activeResult.b}
            profile={profile}
          />
        </>
      )}
    </div>
  );
}
