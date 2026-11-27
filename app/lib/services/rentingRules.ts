import "server-only";

import data from "@/app/lib/data/renting-rules.json";
import type { RentingRuleChunk } from "@/app/lib/rentingRuleChunks";
import { requestEmbedding } from "./locationAnalyst";

// Searches the curated Consumer Affairs Victoria (CAV) renting guidance in
// app/lib/data/renting-rules.json, built by scripts/ingest-renting-rules.ts.
// About a hundred chunks fit in memory, so the search compares the question
// with every chunk instead of using a vector database. If the guidance ever
// grows to many thousands of chunks, only this file needs to change (for
// example to Postgres with pgvector).

export type StoredRentingRuleChunk = RentingRuleChunk & { embedding: number[] };

export type RentingRulesData = {
  attribution: string;
  licence: string;
  embeddingModel: string;
  embeddingDimensions: number;
  dataAsOf: string;
  chunks: StoredRentingRuleChunk[];
};

export type RentingRuleMatch = RentingRuleChunk & { score: number };

// How many chunks one search returns at most. Four sections of up to about
// 300 words keep the tool result under roughly 2,000 tokens.
export const defaultSearchLimit = 4;

// Chunks less similar than this are left out, which drops clearly unrelated
// matches. It cannot tell "not covered" from "covered" on its own: in the
// first retrieval eval, an unrelated question still scored 0.54 while correct
// hits scored 0.46 to 0.73. The analyst reads the returned text
// and decides whether it answers the question. See docs/renting-rules.md.
export const minimumSimilarity = 0.4;

export const rentingRules = data as RentingRulesData;

// Cosine similarity: 1 means the two vectors point the same way (same
// meaning), 0 means unrelated. OpenAI embeddings are already length 1, but
// dividing by the lengths keeps this correct for any vectors.
export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length.");
  }

  let dot = 0;
  let lengthA = 0;
  let lengthB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    lengthA += a[index] * a[index];
    lengthB += b[index] * b[index];
  }

  return lengthA === 0 || lengthB === 0
    ? 0
    : dot / Math.sqrt(lengthA * lengthB);
}

// Scores every chunk against the question vector and keeps the best ones
// above the threshold, best first.
export function rankChunks(
  queryVector: number[],
  chunks: StoredRentingRuleChunk[],
  limit = defaultSearchLimit,
  threshold = minimumSimilarity,
): RentingRuleMatch[] {
  return chunks
    .map(({ embedding, ...chunk }) => ({
      ...chunk,
      score: cosineSimilarity(queryVector, embedding),
    }))
    .filter((match) => match.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Turns the question into a vector with the same model the chunks were
// embedded with, then ranks the chunks.
export async function searchRentingRules(
  query: string,
  limit = defaultSearchLimit,
  rules: RentingRulesData = rentingRules,
) {
  const queryVector = await requestEmbedding({
    text: query,
    model: rules.embeddingModel,
    dimensions: rules.embeddingDimensions,
    label: "The renting rules search",
  });

  return rankChunks(queryVector, rules.chunks, limit);
}
