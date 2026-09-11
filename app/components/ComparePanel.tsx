"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { WeightProfile } from "../lib/categories";
import { isJsonRecord, readApiResult } from "../lib/api";
import type { ComparisonSide, RecentSearch } from "../lib/types";
import { useConversation } from "./ConversationProvider";

function isComparisonSide(value: unknown): value is ComparisonSide {
  return (
    isJsonRecord(value) &&
    typeof value.id === "string" &&
    typeof value.formattedAddress === "string" &&
    typeof value.overallScore === "number" &&
    typeof value.fetchedAt === "string" &&
    Array.isArray(value.scores) &&
    value.scores.every(
      (score) =>
        isJsonRecord(score) &&
        typeof score.id === "string" &&
        typeof score.label === "string" &&
        typeof score.score === "number",
    )
  );
}

function isComparisonPayload(value: Record<string, unknown>) {
  return isComparisonSide(value.a) && isComparisonSide(value.b);
}

type ComparePanelProps = {
  saved: RecentSearch[];
  profile: WeightProfile;
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

function LocationSelect({
  label,
  value,
  otherValue,
  saved,
  onChange,
}: LocationSelectProps) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-semibold text-ink-muted">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={saved.length === 0}
        className="w-full rounded-md border border-line bg-control px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-ring"
      >
        <option value="">
          {saved.length === 0
            ? "No scored saved locations"
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
  const isTie = score === otherScore;

  return (
    <td
      className={`px-3 py-2.5 text-right tabular-nums ${
        isWinner
          ? "font-bold text-accent"
          : isTie
            ? "font-semibold text-ink"
            : "text-ink-soft"
      }`}
      aria-label={`${Math.round(score)}${
        isTie ? ", tie" : isWinner ? ", higher score" : ""
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
  available,
}: {
  locationA: ComparisonSide;
  locationB: ComparisonSide;
  profile: WeightProfile;
  available: boolean;
}) {
  const {
    messages,
    question,
    setQuestion,
    status,
    error,
    askQuestion,
    clearConversation,
  } = useConversation(
    `comparison:${locationA.id}|${locationB.id}`,
    "/api/locations/compare/chat",
    profile,
    available,
    [locationA.id, locationB.id],
  );

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
    status === "loading" && !messages.at(-1)?.content;

  return (
    <section className="mt-6 border-t border-line pt-5">
      <h2 className="text-base font-semibold text-ink">
        Ask about these locations
      </h2>

      <form
        onSubmit={handleSubmit}
        className="mt-3 overflow-hidden rounded-lg border border-line bg-surface-subtle focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-ring"
      >
        {messages.length > 0 || status === "loading" ? (
          <div
            className="max-h-64 space-y-3 overflow-y-auto p-3"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
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
                Comparing these locations…
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          className={`relative ${
            messages.length > 0 || status === "loading"
              ? "border-t border-line"
              : ""
          }`}
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
            rows={2}
            disabled={status === "loading" || !available}
            placeholder={
              available
                ? "Ask which location better fits your routines and priorities…"
                : "Waiting for scores under this profile…"
            }
            className="block w-full resize-none bg-transparent px-3 py-3 pr-24 text-sm leading-6 text-ink outline-none placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={!question.trim() || status === "loading" || !available}
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
        {suggestedComparisonQuestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => void askQuestion(suggestion)}
            disabled={status === "loading" || !available}
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const saved = allSaved.filter((search) => search.overallScore !== null);
  const unavailableCount = allSaved.length - saved.length;
  const requestedAId = searchParams.get("a") ?? "";
  const requestedBId = searchParams.get("b") ?? "";
  const effectiveAId = saved.some((search) => search.id === requestedAId)
    ? requestedAId
    : "";
  const effectiveBId =
    requestedBId !== effectiveAId &&
    saved.some((search) => search.id === requestedBId)
      ? requestedBId
      : "";
  const requestKey = `${effectiveAId}|${effectiveBId}|${profile}`;
  const [result, setResult] = useState<{
    key: string;
    a: ComparisonSide;
    b: ComparisonSide;
  } | null>(null);
  const [requestError, setRequestError] = useState<{
    key: string;
    message: string;
  } | null>(null);

  function changeSelection(side: "a" | "b", id: string) {
    const next = new URLSearchParams(searchParams.toString());

    if (id) {
      next.set(side, id);
    } else {
      next.delete(side);
    }

    next.set("profile", profile);
    window.history.replaceState(null, "", `${pathname}?${next.toString()}`);
  }

  useEffect(() => {
    if (!effectiveAId || !effectiveBId) {
      return;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({
      a: effectiveAId,
      b: effectiveBId,
      profile,
    });

    fetch(`/api/compare?${query}`, { signal: controller.signal })
      .then((response) =>
        readApiResult<{ a: ComparisonSide; b: ComparisonSide }>(
          response,
          isComparisonPayload,
        ),
      )
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }

        if (data.ok) {
          setResult({ key: requestKey, a: data.a, b: data.b });
        } else {
          setRequestError({ key: requestKey, message: data.error });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRequestError({
            key: requestKey,
            message: "Comparison failed to load. Try again.",
          });
        }
      });

    return () => controller.abort();
  }, [effectiveAId, effectiveBId, profile, requestKey]);

  const activeResult = result?.key === requestKey ? result : null;
  const retainedPairResult =
    result &&
    result.a.id === effectiveAId &&
    result.b.id === effectiveBId
      ? result
      : null;
  const activeError =
    requestError?.key === requestKey ? requestError.message : "";
  const isLoading =
    Boolean(effectiveAId && effectiveBId) && !activeResult && !activeError;

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-ink">Choose two locations</h2>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm leading-6 text-ink-soft">
        <li>The table recalculates both locations for the selected mobility profile.</li>
        <li>The higher score in each row is highlighted.</li>
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <LocationSelect
          label="Location A"
          value={effectiveAId}
          otherValue={effectiveBId}
          saved={saved}
          onChange={(id) => changeSelection("a", id)}
        />
        <LocationSelect
          label="Location B"
          value={effectiveBId}
          otherValue={effectiveAId}
          saved={saved}
          onChange={(id) => changeSelection("b", id)}
        />
      </div>

      {saved.length < 2 ? (
        <div className="mt-4 rounded-lg border border-line bg-surface-subtle p-4 text-sm leading-6 text-ink-soft">
          <p>
            {saved.length === 0
              ? "Save two scored locations to start a comparison."
              : "Save one more scored location to start a comparison."}
          </p>
          <Link href="/" className="mt-2 inline-block font-semibold text-accent">
            Search for a location
          </Link>
        </div>
      ) : !effectiveAId || !effectiveBId ? (
        <p className="mt-4 rounded-lg border border-line bg-surface-subtle px-4 py-3 text-sm text-ink-soft">
          Choose a different saved location in each field to load the
          comparison.
        </p>
      ) : null}

      {unavailableCount > 0 ? (
        <ul className="mt-3 list-disc space-y-0.5 pl-4 text-xs leading-5 text-ink-muted">
          <li>{unavailableCount} saved {unavailableCount === 1 ? "location has" : "locations have"} no current score data.</li>
          <li>Search {unavailableCount === 1 ? "it" : "them"} again to include {unavailableCount === 1 ? "it" : "them"} here.</li>
        </ul>
      ) : null}

      {isLoading ? (
        <p role="status" className="mt-5 text-sm font-medium text-ink-soft">
          Recalculating both locations…
        </p>
      ) : null}

      {activeError ? (
        <p
          role="alert"
          className="mt-5 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink"
        >
          {activeError}
        </p>
      ) : null}

      {activeResult ? (
        <>
          <p className="mt-5 text-xs text-ink-muted sm:hidden">
            Scroll the table sideways to see both locations.
          </p>
          <div
            role="region"
            aria-label="Location score comparison"
            tabIndex={0}
            className="mt-2 overflow-x-auto rounded-lg border border-line sm:mt-5"
          >
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <caption className="sr-only">
                Category score comparison using the{" "}
                {profile === "carFree" ? "No car" : "Car owner"} profile
              </caption>
              <thead>
                <tr className="border-b border-line-strong bg-surface-subtle text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-3 text-left font-semibold">Category</th>
                  <th className="max-w-56 px-3 py-3 text-right font-semibold">
                    {activeResult.a.formattedAddress}
                  </th>
                  <th className="max-w-56 px-3 py-3 text-right font-semibold">
                    {activeResult.b.formattedAddress}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line bg-surface font-semibold">
                  <td className="px-3 py-2.5">Overall</td>
                  {scoreCell(
                    activeResult.a.overallScore,
                    activeResult.b.overallScore,
                  )}
                  {scoreCell(
                    activeResult.b.overallScore,
                    activeResult.a.overallScore,
                  )}
                </tr>
                {activeResult.a.scores.map((scoreA) => {
                  const scoreB = activeResult.b.scores.find(
                    (candidate) => candidate.id === scoreA.id,
                  );

                  if (!scoreB) {
                    return null;
                  }

                  return (
                    <tr key={scoreA.id} className="border-b border-line last:border-0">
                      <td className="px-3 py-2.5 text-ink-soft">
                        {scoreA.label}
                      </td>
                      {scoreCell(scoreA.score, scoreB.score)}
                      {scoreCell(scoreB.score, scoreA.score)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs leading-5 text-ink-muted">
            Evidence collected{" "}
            {new Date(activeResult.a.fetchedAt).toLocaleDateString()} for A and{" "}
            {new Date(activeResult.b.fetchedAt).toLocaleDateString()} for B.
          </p>

        </>
      ) : null}

      {retainedPairResult ? (
        <ComparisonAnalyst
          key={`${retainedPairResult.a.id}|${retainedPairResult.b.id}`}
          locationA={retainedPairResult.a}
          locationB={retainedPairResult.b}
          profile={profile}
          available={Boolean(activeResult)}
        />
      ) : null}
    </section>
  );
}
