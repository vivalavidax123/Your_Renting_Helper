// Grades the renting rules search (app/lib/services/rentingRules.ts) on
// labelled questions in retrievalCases.ts. It embeds each question with the
// real OpenAI embeddings API (a fraction of a cent per run), so it only runs
// through `npm run eval`, never in `npm test` or CI.
//
// Metrics:
// - hit rate at 4: share of covered questions where an expected chunk is in
//   the top 4 results (the number the analyst tool will return)
// - MRR (mean reciprocal rank): 1 when the first result is right, 1/2 when
//   the second is, 0 when none of the top 4 is; rewards ranking well
// - uncovered questions: should return no results above the threshold
//
// The run fails when the hit rate drops below 85%, so a bad re-ingest or a
// change to chunking is caught. MRR and the uncovered results are reported.

import { mkdirSync, writeFileSync } from "node:fs";
import { afterAll, expect, it } from "vitest";

import {
  defaultSearchLimit,
  minimumSimilarity,
  rentingRules,
  searchRentingRules,
} from "@/app/lib/services/rentingRules";
import { type RetrievalCase, retrievalCases } from "./retrievalCases";

const minimumHitRate = 0.85;

type RetrievalResult = {
  id: string;
  expected: string[];
  returned: { id: string; score: number }[];
  rank: number | null;
};

const results: RetrievalResult[] = [];

it("labels only chunk ids that exist", () => {
  const ids = new Set(rentingRules.chunks.map((chunk) => chunk.id));
  const unknown = retrievalCases.flatMap((testCase) =>
    testCase.expected.filter((id) => !ids.has(id)),
  );

  expect(unknown).toEqual([]);
});

async function runCase(testCase: RetrievalCase) {
  const matches = await searchRentingRules(
    testCase.question,
    defaultSearchLimit,
  );
  const index = matches.findIndex((match) =>
    testCase.expected.includes(match.id),
  );

  results.push({
    id: testCase.id,
    expected: testCase.expected,
    returned: matches.map((match) => ({
      id: match.id,
      score: Math.round(match.score * 1000) / 1000,
    })),
    rank: index === -1 ? null : index + 1,
  });
}

it.concurrent.each(retrievalCases.map((testCase) => [testCase.id, testCase]))(
  "%s",
  async (_id, testCase) => {
    await runCase(testCase as RetrievalCase);
  },
);

afterAll(() => {
  const covered = results.filter((result) => result.expected.length > 0);
  const uncovered = results.filter((result) => result.expected.length === 0);
  const hits = covered.filter((result) => result.rank !== null);
  const hitRate = covered.length > 0 ? hits.length / covered.length : 0;
  const mrr =
    covered.reduce(
      (sum, result) => sum + (result.rank === null ? 0 : 1 / result.rank),
      0,
    ) / Math.max(covered.length, 1);
  const uncoveredClean = uncovered.filter(
    (result) => result.returned.length === 0,
  );

  const lines = [
    "",
    `Renting rules retrieval (${rentingRules.chunks.length} chunks, threshold ${minimumSimilarity}, top ${defaultSearchLimit})`,
    `  hit rate at ${defaultSearchLimit}:  ${hits.length} / ${covered.length} (${Math.round(hitRate * 100)}%)`,
    `  MRR:            ${mrr.toFixed(2)}`,
    `  uncovered questions with no results: ${uncoveredClean.length} / ${uncovered.length}`,
    "",
    ...results
      .filter(
        (result) =>
          (result.expected.length > 0 && result.rank !== 1) ||
          (result.expected.length === 0 && result.returned.length > 0),
      )
      .map(
        (result) =>
          `  ${result.id}: rank ${result.rank ?? "miss"}, got ${
            result.returned
              .map((match) => `${match.id} (${match.score})`)
              .join(", ") || "nothing"
          }`,
      ),
  ];
  console.log(lines.join("\n"));

  mkdirSync("evals/results", { recursive: true });
  writeFileSync(
    `evals/results/retrieval-${new Date().toISOString().replaceAll(":", "-")}.json`,
    `${JSON.stringify({ hitRate, mrr, results }, null, 2)}\n`,
  );

  expect(hitRate).toBeGreaterThanOrEqual(minimumHitRate);
});
