"use client";

import { useEffect, useState } from "react";
import { isJsonRecord, readApiResult } from "../lib/api";
import type {
  ComparisonSide,
  RecentSearch,
} from "../lib/types";

function isComparisonPayload(value: Record<string, unknown>) {
  return isJsonRecord(value.a) && isJsonRecord(value.b);
}

type ComparePanelProps = {
  saved: RecentSearch[];
};

type LocationSelectProps = {
  label: string;
  value: string;
  otherValue: string;
  saved: RecentSearch[];
  onChange: (id: string) => void;
};

function LocationSelect({ label, value, otherValue, saved, onChange }: LocationSelectProps) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm font-normal text-slate-900"
      >
        <option value="">Choose a saved location…</option>
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
        isWinner ? "font-bold text-emerald-700" : "text-slate-700"
      }`}
    >
      {Math.round(score)}
    </td>
  );
}

export function ComparePanel({ saved: allSaved }: ComparePanelProps) {
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

  if (saved.length < 2) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-950">Compare saved locations</h2>
      <p className="mt-1 text-xs text-slate-600">
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

      {activeError && <p className="mt-3 text-sm text-red-600">{activeError}</p>}

      {activeResult && (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-xs uppercase tracking-wide text-slate-500">
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
            <tr className="border-b border-slate-200 bg-white font-semibold">
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
                <tr key={scoreA.id} className="border-b border-slate-200">
                  <td className="px-3 py-2 text-slate-700">{scoreA.label}</td>
                  {scoreCell(scoreA.score, scoreB.score)}
                  {scoreCell(scoreB.score, scoreA.score)}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
