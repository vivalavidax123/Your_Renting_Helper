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
// - exact-term misses: covered questions that share a word or phrase with
//   the right chunk (keyTerms) yet missed the top 4. Vector search matches
//   meaning, not words, so it can miss "dishwasher" even when the chunk says
//   "broken dishwasher". Keyword search (BM25) is there to catch these
// - uncovered questions: how many return nothing above the threshold. This
//   is reported, not enforced: similarity alone cannot reliably spot a
//   question the guidance does not cover (see docs/renting-rules.md)
//
// Every metric is reported twice: for vector search alone and for the hybrid
// search the app uses (vector + BM25 keywords, merged by Reciprocal Rank
// Fusion). The run fails when the hybrid hit rate drops below 85%, so a bad
// re-ingest or a change to chunking or ranking is caught. MRR and the
// uncovered results are reported.

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { afterAll, expect, it } from "vitest";

import { requestEmbedding } from "@/app/lib/services/locationAnalyst";
import {
  defaultSearchLimit,
  minimumSimilarity,
  rankChunks,
  rankChunksHybrid,
  type RentingRuleMatch,
  rentingRules,
} from "@/app/lib/services/rentingRules";
import { type RetrievalCase, retrievalCases } from "./retrievalCases";

const minimumHitRate = 0.85;

type Mode = "vector" | "hybrid";
const modes: Mode[] = ["vector", "hybrid"];

type ModeResult = {
  returned: { id: string; score: number }[];
  rank: number | null;
  // Where the best expected chunk lands when every chunk is ranked, so a
  // miss shows whether it was close (6th) or far off (60th).
  fullRank: number;
};

type RetrievalResult = {
  id: string;
  expected: string[];
  keyTerms: string[];
} & Record<Mode, ModeResult>;

const results: RetrievalResult[] = [];

it("labels only chunk ids and key terms that exist", () => {
  const chunks = new Map(
    rentingRules.chunks.map((chunk) => [chunk.id, chunk.text.toLowerCase()]),
  );
  const unknownIds = retrievalCases.flatMap((testCase) =>
    testCase.expected.filter((id) => !chunks.has(id)),
  );
  // A key term must appear word for word in at least one expected chunk.
  const unmatchedTerms = retrievalCases.flatMap((testCase) =>
    (testCase.keyTerms ?? [])
      .filter(
        (term) =>
          !testCase.expected.some((id) =>
            chunks.get(id)?.includes(term.toLowerCase()),
          ),
      )
      .map((term) => `${testCase.id}: ${term}`),
  );

  expect(unknownIds).toEqual([]);
  expect(unmatchedTerms).toEqual([]);
});

// Ranks one question both ways from a single embedding call: vector only
// (rankChunks) and the app's hybrid search (rankChunksHybrid). Showing both
// in every run tells whether keyword search is still earning its place.
async function runCase(testCase: RetrievalCase) {
  const queryVector = await requestEmbedding({
    text: testCase.question,
    model: rentingRules.embeddingModel,
    dimensions: rentingRules.embeddingDimensions,
    label: "The retrieval eval",
  });
  const rankers: Record<
    Mode,
    (limit?: number, threshold?: number) => RentingRuleMatch[]
  > = {
    vector: (limit, threshold) =>
      rankChunks(queryVector, rentingRules.chunks, limit, threshold),
    hybrid: (limit, threshold) =>
      rankChunksHybrid(
        testCase.question,
        queryVector,
        rentingRules.chunks,
        limit,
        threshold,
      ),
  };
  const isExpected = (match: RentingRuleMatch) =>
    testCase.expected.includes(match.id);

  const byMode = Object.fromEntries(
    modes.map((mode) => {
      const matches = rankers[mode]();
      const allMatches = rankers[mode](rentingRules.chunks.length, -1);
      const index = matches.findIndex(isExpected);

      return [
        mode,
        {
          returned: matches.map((match) => ({
            id: match.id,
            score: Math.round(match.score * 1000) / 1000,
          })),
          rank: index === -1 ? null : index + 1,
          fullRank: allMatches.findIndex(isExpected) + 1,
        },
      ];
    }),
  ) as Record<Mode, ModeResult>;

  results.push({
    id: testCase.id,
    expected: testCase.expected,
    keyTerms: testCase.keyTerms ?? [],
    ...byMode,
  });
}

it.concurrent.each(retrievalCases.map((testCase) => [testCase.id, testCase]))(
  "%s",
  async (_id, testCase) => {
    await runCase(testCase as RetrievalCase);
  },
);

function summarize(mode: Mode) {
  const covered = results.filter((result) => result.expected.length > 0);
  const uncovered = results.filter((result) => result.expected.length === 0);
  const hits = covered.filter((result) => result[mode].rank !== null);
  const hitRate = covered.length > 0 ? hits.length / covered.length : 0;
  const mrr =
    covered.reduce((sum, result) => {
      const rank = result[mode].rank;
      return sum + (rank === null ? 0 : 1 / rank);
    }, 0) / Math.max(covered.length, 1);
  const uncoveredClean = uncovered.filter(
    (result) => result[mode].returned.length === 0,
  );
  const withKeyTerms = covered.filter((result) => result.keyTerms.length > 0);
  const exactTermMisses = withKeyTerms.filter(
    (result) => result[mode].rank === null,
  );

  const lines = [
    `${mode === "hybrid" ? "Hybrid (vector + BM25, used by the app)" : "Vector only"}`,
    `  hit rate at ${defaultSearchLimit}:  ${hits.length} / ${covered.length} (${Math.round(hitRate * 100)}%)`,
    `  MRR:            ${mrr.toFixed(2)}`,
    `  exact-term misses: ${exactTermMisses.length} / ${withKeyTerms.length}${exactTermMisses.length > 0 ? ` (${exactTermMisses.map((result) => result.id).join(", ")})` : ""}`,
    `  uncovered questions with no results: ${uncoveredClean.length} / ${uncovered.length}`,
    "",
    ...results
      .filter(
        (result) =>
          (result.expected.length > 0 && result[mode].rank !== 1) ||
          (result.expected.length === 0 && result[mode].returned.length > 0),
      )
      .map(
        (result) =>
          `  ${result.id}: rank ${result[mode].rank ?? `miss (ranked ${result[mode].fullRank})`}, got ${
            result[mode].returned
              .map((match) => `${match.id} (${match.score})`)
              .join(", ") || "nothing"
          }`,
      ),
    "",
  ];

  return {
    hitRate,
    mrr,
    exactTermMisses: exactTermMisses.map((result) => result.id),
    lines,
  };
}

afterAll(() => {
  const summaries = Object.fromEntries(
    modes.map((mode) => [mode, summarize(mode)]),
  ) as Record<Mode, ReturnType<typeof summarize>>;
  const lines = [
    "",
    `Renting rules retrieval (${rentingRules.chunks.length} chunks, threshold ${minimumSimilarity}, top ${defaultSearchLimit})`,
    "",
    ...summaries.hybrid.lines,
    ...summaries.vector.lines,
  ];
  // process.stdout.write, not console.log: Vitest does not reliably show
  // console output from afterAll.
  process.stdout.write(`${lines.join("\n")}\n`);

  // On GitHub Actions, also show the summary on the run's page, so the
  // weekly numbers can be read without downloading the artifact.
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### Renting rules retrieval\n\n\`\`\`text\n${lines.join("\n").trim()}\n\`\`\`\n`,
    );
  }

  mkdirSync("evals/results", { recursive: true });
  writeFileSync(
    `evals/results/retrieval-${new Date().toISOString().replaceAll(":", "-")}.json`,
    `${JSON.stringify(
      {
        hybrid: { ...summaries.hybrid, lines: undefined },
        vector: { ...summaries.vector, lines: undefined },
        results,
      },
      null,
      2,
    )}\n`,
  );

  // The gate applies to the search the app actually uses.
  expect(summaries.hybrid.hitRate).toBeGreaterThanOrEqual(minimumHitRate);
});
