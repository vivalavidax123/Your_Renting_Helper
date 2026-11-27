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
//
// The search is hybrid: vector similarity finds chunks with the same meaning,
// BM25 keyword scoring finds chunks that share a rare word with the question
// ("dishwasher"), and Reciprocal Rank Fusion merges the two orders. See
// docs/renting-rules.md.

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

// Vector search: scores every chunk against the question vector and keeps
// the best ones above the threshold, best first.
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

// Words too common to say anything about which chunk answers a question.
const stopWords = new Set(
  (
    "a an and are as at be but by can do does for from get have how i if in " +
    "is it its me my of on or our re so that the their them there they this " +
    "to up us we what when where which who will with would you your"
  ).split(" "),
);

// Splits text into lowercase words, drops stop words, and strips a final "s"
// so "bonds" matches "bond". This is deliberately simpler than a stemmer:
// "selling" still does not match "sale".
export function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !stopWords.has(word))
    .map((word) =>
      word.length > 3 && word.endsWith("s") && !word.endsWith("ss")
        ? word.slice(0, -1)
        : word,
    );
}

// BM25 constants: k1 sets how quickly repeats of a word stop adding score,
// b how much long chunks are discounted. These are the usual defaults.
const k1 = 1.2;
const b = 0.75;

// BM25 keyword score of every chunk that shares at least one word with the
// query. For each query word: IDF (rarer across all chunks = worth more)
// times the word's count in the chunk, with diminishing returns and a small
// discount for long chunks. The index is rebuilt on every call; for about a
// hundred chunks that takes about a millisecond, so caching is not worth it.
export function keywordScores(
  query: string,
  chunks: RentingRuleChunk[],
): Map<string, number> {
  const documents = chunks.map((chunk) =>
    tokenize(`${chunk.title} ${chunk.section} ${chunk.text}`),
  );
  const averageLength =
    documents.reduce((sum, words) => sum + words.length, 0) /
    Math.max(documents.length, 1);
  const documentFrequency = new Map<string, number>();

  for (const words of documents) {
    for (const word of new Set(words)) {
      documentFrequency.set(word, (documentFrequency.get(word) ?? 0) + 1);
    }
  }

  const queryWords = [...new Set(tokenize(query))];
  const scores = new Map<string, number>();

  documents.forEach((words, index) => {
    const counts = new Map<string, number>();
    for (const word of words) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }

    let score = 0;
    for (const word of queryWords) {
      const count = counts.get(word) ?? 0;
      if (count === 0) {
        continue;
      }
      const containing = documentFrequency.get(word) ?? 0;
      const idf = Math.log(
        1 + (documents.length - containing + 0.5) / (containing + 0.5),
      );
      score +=
        (idf * count * (k1 + 1)) /
        (count + k1 * (1 - b + (b * words.length) / averageLength));
    }

    if (score > 0) {
      scores.set(chunks[index].id, score);
    }
  });

  return scores;
}

// Reciprocal Rank Fusion: each ranking gives an item 1 / (60 + its rank),
// and the parts are added. It uses positions only, so rankings with
// incomparable scores (cosine 0 to 1, BM25 unbounded) can be merged. An item
// near the top of both lists beats one that is first in only one. 60 is the
// constant from the original RRF paper; it keeps first place from dominating.
export function fuseRankings(rankings: string[][], k = 60) {
  const fused = new Map<string, number>();

  for (const ranking of rankings) {
    ranking.forEach((id, index) => {
      fused.set(id, (fused.get(id) ?? 0) + 1 / (k + index + 1));
    });
  }

  return fused;
}

// The app's search order. The similarity threshold still decides which
// chunks are candidates, so unrelated questions behave as with vector search
// alone; fusion only reorders the candidates. Each match keeps its cosine
// similarity as `score`, because fused values (about 0.03) mean nothing to a
// reader.
export function rankChunksHybrid(
  query: string,
  queryVector: number[],
  chunks: StoredRentingRuleChunk[],
  limit = defaultSearchLimit,
  threshold = minimumSimilarity,
): RentingRuleMatch[] {
  const candidates = rankChunks(queryVector, chunks, chunks.length, threshold);
  // Scored over all chunks, so word rarity (IDF) reflects the whole guidance.
  const keyword = keywordScores(query, chunks);
  const keywordOrder = candidates
    .filter((match) => keyword.has(match.id))
    .sort((a, b) => (keyword.get(b.id) ?? 0) - (keyword.get(a.id) ?? 0))
    .map((match) => match.id);
  const fused = fuseRankings([
    candidates.map((match) => match.id),
    keywordOrder,
  ]);

  // Array sort is stable, so equal fused values keep the cosine order.
  return candidates
    .sort((a, b) => (fused.get(b.id) ?? 0) - (fused.get(a.id) ?? 0))
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

  return rankChunksHybrid(query, queryVector, rules.chunks, limit);
}
