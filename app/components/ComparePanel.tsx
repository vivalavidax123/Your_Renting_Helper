"use client";

import { useEffect, useState } from "react";
import {
  weightPresetLabels,
  weightProfileLabels,
  type WeightPreset,
  type WeightProfile,
} from "@/app/lib/categories";
import { isJsonRecord, readApiResult } from "@/app/lib/api";
import type { ComparisonSide, RecentSearch } from "@/app/lib/types";
import { formatEvidenceDate, summarizeComparison } from "@/app/lib/utils";
import { AnalystChat } from "./AnalystChat";
import { CategoryIcon, CheckIcon, StarIcon } from "./icons";
import { ScoreRing } from "./ScoreRing";

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
  signedIn: boolean;
  profile: WeightProfile;
  preset: WeightPreset;
};

const suggestedComparisonQuestions = [
  "Which is easier without a car?",
  "Which has better everyday convenience?",
  "What is the biggest trade-off between them?",
  "Which better suits frequent café and gym use?",
];

// Fixed hues for the two sides, used for the letter badges and bars.
const sideStyles = [
  {
    letter: "A",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    bar: "bg-sky-500",
    border: "border-sky-500",
  },
  {
    letter: "B",
    badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    bar: "bg-orange-500",
    border: "border-orange-500",
  },
];

const shortAddress = (address: string) => address.replace(/, Australia$/, "");

const joinLabels = (labels: string[]) => labels.join(" and ").toLowerCase();

function ScoreCell({
  score,
  otherScore,
  barClass,
}: {
  score: number;
  otherScore: number;
  barClass: string;
}) {
  const isWinner = Math.round(score) > Math.round(otherScore);

  return (
    <td className="px-2 py-2 align-middle">
      <span
        className={`flex items-center gap-1 tabular-nums ${
          isWinner ? "font-bold text-ink" : "text-ink-soft"
        }`}
      >
        {Math.round(score)}
        {isWinner ? (
          <>
            <CheckIcon className="size-3.5 text-accent" />
            <span className="sr-only">higher</span>
          </>
        ) : null}
      </span>
      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-score-track">
        <span
          className={`block h-full rounded-full ${barClass}`}
          style={{ width: `${score}%` }}
        />
      </span>
    </td>
  );
}

export function ComparePanel({
  saved: allSaved,
  signedIn,
  profile,
  preset,
}: ComparePanelProps) {
  // Comparison needs stored scores, so only offer locations that have a
  // snapshot; scoreless favourites reappear here after being re-searched.
  const saved = allSaved.filter((search) => search.overallScore !== null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Retry bumps attempt, which changes the key: the old error no longer
  // matches, so the panel shows loading and the effect fetches again.
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    a: ComparisonSide;
    b: ComparisonSide;
  } | null>(null);
  const [requestError, setRequestError] = useState<{
    key: string;
    message: string;
  } | null>(null);

  // Derive stale selections instead of synchronizing them in another effect.
  const [effectiveAId = "", effectiveBId = ""] = selectedIds.filter((id) =>
    saved.some((search) => search.id === id),
  );
  // Both sides are rescored for the profile and priorities chosen in the
  // result header, so they are part of what identifies a request.
  const requestKey = `${effectiveAId}|${effectiveBId}|${profile}|${preset}|${attempt}`;

  useEffect(() => {
    if (!effectiveAId || !effectiveBId) {
      return;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({
      a: effectiveAId,
      b: effectiveBId,
      profile,
      preset,
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
            message: "Comparison failed to load.",
          });
        }
      });

    return () => controller.abort();
  }, [effectiveAId, effectiveBId, profile, preset, requestKey]);

  const activeResult = result?.key === requestKey ? result : null;
  // Keeps the chat (and its transcript) mounted while a profile or
  // priority change rescored the same pair.
  const retainedPairResult =
    result && result.a.id === effectiveAId && result.b.id === effectiveBId
      ? result
      : null;
  const activeError =
    requestError?.key === requestKey ? requestError.message : "";
  const isLoading =
    Boolean(effectiveAId && effectiveBId) && !activeResult && !activeError;

  // Picking a third location replaces B, so A stays put as the reference.
  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((selectedId) => selectedId !== id);
      }

      return current.length < 2 ? [...current, id] : [current[0], id];
    });
  }

  const summary = activeResult
    ? summarizeComparison(activeResult.a.scores, activeResult.b.scores)
    : null;

  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5 print:hidden">
      <h2 className="text-base font-semibold text-ink">
        Compare saved locations
      </h2>

      {saved.length < 2 ? (
        <p className="mt-2 flex items-start gap-2 text-sm text-ink-muted">
          <StarIcon className="mt-0.5 size-4 shrink-0 text-ink-faint" />
          {signedIn
            ? "Save two or more searched locations to compare them here."
            : "Sign in and save two or more locations to compare them here."}
        </p>
      ) : (
        <>
          <p className="mt-0.5 text-xs text-ink-muted">
            Pick two saved locations to see their scores side by side, using the{" "}
            {weightProfileLabels[profile]} profile and{" "}
            {weightPresetLabels[preset]} priorities chosen above.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {saved.map((search) => {
              const side =
                search.id === effectiveAId
                  ? sideStyles[0]
                  : search.id === effectiveBId
                    ? sideStyles[1]
                    : null;

              return (
                <li key={search.id} className="min-w-0">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={side !== null}
                    onClick={() => toggleSelected(search.id)}
                    className={`focus-ring flex w-full items-start gap-2 rounded-lg border-2 px-3 py-2 text-left transition sm:w-44 ${
                      side
                        ? side.border
                        : "border-line hover:border-line-strong"
                    }`}
                  >
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                        side ? side.badge : "bg-surface-raised text-ink-muted"
                      }`}
                    >
                      {side ? side.letter : "+"}
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm font-medium leading-snug text-ink">
                        {shortAddress(search.formattedAddress)}
                      </span>
                      <span className="text-xs tabular-nums text-ink-muted">
                        Score {Math.round(search.overallScore ?? 0)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {allSaved.length > saved.length ? (
        <p className="mt-2 text-xs text-ink-muted">
          {allSaved.length - saved.length} saved{" "}
          {allSaved.length - saved.length === 1
            ? "location has"
            : "locations have"}{" "}
          no current score. Search again to include{" "}
          {allSaved.length - saved.length === 1 ? "it" : "them"}.
        </p>
      ) : null}

      {isLoading ? (
        <p role="status" className="mt-4 text-sm font-medium text-ink-soft">
          Recalculating both locations…
        </p>
      ) : null}

      {activeError ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink"
        >
          {activeError}{" "}
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="focus-ring rounded underline"
          >
            Retry
          </button>
        </p>
      ) : null}

      {activeResult && summary ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[activeResult.a, activeResult.b].map((side, index) => (
              <div
                key={side.id}
                className="flex items-center gap-2 rounded-lg bg-surface-subtle px-2 py-2 sm:gap-3 sm:px-3"
              >
                <ScoreRing
                  score={Math.round(side.overallScore)}
                  name={`Location ${sideStyles[index].letter} overall score`}
                  className="size-14 sm:size-16"
                />
                <div className="min-w-0">
                  <span
                    className={`inline-flex size-5 items-center justify-center rounded-full text-[11px] font-semibold ${sideStyles[index].badge}`}
                  >
                    {sideStyles[index].letter}
                  </span>
                  <p className="line-clamp-2 text-xs font-medium text-ink">
                    {shortAddress(side.formattedAddress)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-sm text-ink-soft">
            {summary.aLeads.length === 0 && summary.bLeads.length === 0
              ? "These two locations score about the same in every category."
              : [
                  summary.aLeads.length > 0
                    ? `A is better for ${joinLabels(summary.aLeads)}.`
                    : "",
                  summary.bLeads.length > 0
                    ? `B is better for ${joinLabels(summary.bLeads)}.`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
          </p>

          <table className="mt-3 w-full table-fixed border-collapse text-sm">
            <caption className="sr-only">
              Category score comparison using the {weightProfileLabels[profile]}{" "}
              profile and {weightPresetLabels[preset]} weighting
            </caption>
            <thead>
              <tr className="border-b border-line-strong text-xs text-ink-muted">
                <th className="w-[42%] px-2 py-2 text-left font-semibold">
                  Category
                </th>
                {[activeResult.a, activeResult.b].map((side, index) => (
                  <th
                    key={side.id}
                    className="px-2 py-2 text-left font-semibold"
                  >
                    {sideStyles[index].letter}
                    <span className="sr-only">: {side.formattedAddress}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line bg-surface-subtle font-semibold">
                <th scope="row" className="px-2 py-2 text-left">
                  Overall
                </th>
                <ScoreCell
                  score={activeResult.a.overallScore}
                  otherScore={activeResult.b.overallScore}
                  barClass={sideStyles[0].bar}
                />
                <ScoreCell
                  score={activeResult.b.overallScore}
                  otherScore={activeResult.a.overallScore}
                  barClass={sideStyles[1].bar}
                />
              </tr>
              {activeResult.a.scores.map((scoreA) => {
                const scoreB = activeResult.b.scores.find(
                  (candidate) => candidate.id === scoreA.id,
                );

                if (!scoreB) {
                  return null;
                }

                return (
                  <tr key={scoreA.id} className="border-b border-line-soft">
                    <th
                      scope="row"
                      className="px-2 py-2 text-left font-normal text-ink-soft"
                    >
                      <span className="flex items-center gap-1.5">
                        <CategoryIcon
                          categoryId={scoreA.id}
                          className="size-4 shrink-0 text-ink-muted"
                        />
                        <span className="leading-tight">{scoreA.label}</span>
                      </span>
                    </th>
                    <ScoreCell
                      score={scoreA.score}
                      otherScore={scoreB.score}
                      barClass={sideStyles[0].bar}
                    />
                    <ScoreCell
                      score={scoreB.score}
                      otherScore={scoreA.score}
                      barClass={sideStyles[1].bar}
                    />
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="mt-3 text-xs leading-5 text-ink-muted">
            Evidence collected {formatEvidenceDate(activeResult.a.fetchedAt)}{" "}
            for A and {formatEvidenceDate(activeResult.b.fetchedAt)} for B.
          </p>
        </>
      ) : null}

      {retainedPairResult ? (
        <AnalystChat
          key={`${retainedPairResult.a.id}|${retainedPairResult.b.id}`}
          conversationKey={`comparison:${retainedPairResult.a.id}|${retainedPairResult.b.id}`}
          endpoint="/api/locations/compare/chat"
          profile={profile}
          preset={preset}
          available={Boolean(activeResult)}
          locationIds={[retainedPairResult.a.id, retainedPairResult.b.id]}
          title="Ask about these locations"
          inputId="location-comparison-question"
          placeholder="Ask which location better fits your routines and priorities…"
          unavailablePlaceholder="Waiting for scores under this profile…"
          pendingLabel="Comparing these locations…"
          suggestions={suggestedComparisonQuestions}
          formMarginClassName="mt-3"
        />
      ) : null}
    </section>
  );
}
