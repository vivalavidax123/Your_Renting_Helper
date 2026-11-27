import { readdirSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  chunkRentingRulePage,
  parseRentingRulePage,
} from "@/app/lib/rentingRuleChunks";
import {
  cosineSimilarity,
  rankChunks,
  type RentingRulesData,
  rentingRules,
  searchRentingRules,
  type StoredRentingRuleChunk,
} from "./rentingRules";

function storedChunk(id: string, embedding: number[]): StoredRentingRuleChunk {
  return {
    id,
    title: "Bond amounts and payments",
    section: id,
    url: "https://www.consumer.vic.gov.au/housing/renting/bond",
    pageUpdated: "2026-09-28",
    text: `Text of ${id}.`,
    embedding,
  };
}

const chunks = [
  storedChunk("east", [1, 0, 0]),
  storedChunk("north-east", [0.8, 0.6, 0]),
  storedChunk("north", [0, 1, 0]),
  storedChunk("west", [-1, 0, 0]),
];

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_MODEL", "gpt-5.6-terra");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("cosineSimilarity", () => {
  it("is 1 for the same direction, 0 for unrelated, -1 for opposite", () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 3])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
  });

  it("refuses vectors of different sizes", () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow();
  });
});

describe("rankChunks", () => {
  it("returns the most similar chunks first, without their vectors", () => {
    const matches = rankChunks([1, 0.1, 0], chunks, 2, 0);

    expect(matches.map((match) => match.id)).toEqual(["east", "north-east"]);
    expect(matches[0]).not.toHaveProperty("embedding");
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });

  it("leaves out chunks below the similarity threshold", () => {
    const matches = rankChunks([1, 0, 0], chunks, 4, 0.5);

    expect(matches.map((match) => match.id)).toEqual(["east", "north-east"]);
  });
});

describe("searchRentingRules", () => {
  it("embeds the query with the data's model and ranks the chunks", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json({ data: [{ index: 0, embedding: [0, 1, 0] }] }),
      );
    const rules: RentingRulesData = {
      attribution: "© State of Victoria (Consumer Affairs Victoria)",
      licence: "CC BY 4.0",
      embeddingModel: "text-embedding-3-small",
      embeddingDimensions: 3,
      dataAsOf: "2026-11-27",
      chunks,
    };

    const matches = await searchRentingRules("pet bond", 1, rules);

    expect(matches.map((match) => match.id)).toEqual(["north"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/embeddings",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      model: "text-embedding-3-small",
      dimensions: 3,
      input: "pet bond",
    });
  });

  it("turns a malformed embedding response into a friendly error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ data: [{ embedding: [1, 2] }] }),
    );

    await expect(searchRentingRules("bond")).rejects.toThrow(
      "The renting rules search returned an invalid response",
    );
  });
});

// The JSON is generated from knowledge/renting/ by `npm run ingest:renting`.
// This fails when a page was edited without running the ingest again.
describe("renting-rules.json", () => {
  const directory = "knowledge/renting";
  const expected = readdirSync(directory)
    .filter((file) => file.endsWith(".md") && file !== "README.md")
    .sort()
    .flatMap((file) =>
      chunkRentingRulePage(
        parseRentingRulePage(
          file.replace(/\.md$/, ""),
          readFileSync(`${directory}/${file}`, "utf8"),
        ),
      ),
    );

  it("matches the curated pages", () => {
    // toMatchObject ignores the extra "embedding" field on each stored chunk.
    expect(rentingRules.chunks).toHaveLength(expected.length);
    expect(rentingRules.chunks).toMatchObject(expected);
  });

  it("has one vector of the stated size per chunk, and attribution", () => {
    expect(rentingRules.embeddingModel).toBe("text-embedding-3-small");

    for (const chunk of rentingRules.chunks) {
      expect(chunk.embedding).toHaveLength(rentingRules.embeddingDimensions);
    }

    expect(rentingRules.attribution).toBe(
      "© State of Victoria (Consumer Affairs Victoria)",
    );
    expect(rentingRules.licence).toContain("CC BY 4.0");
  });
});
