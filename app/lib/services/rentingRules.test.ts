import { readdirSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  chunkRentingRulePage,
  parseRentingRulePage,
} from "@/app/lib/rentingRuleChunks";
import {
  cosineSimilarity,
  fuseRankings,
  keywordScores,
  rankChunks,
  rankChunksHybrid,
  type RentingRulesData,
  rentingRules,
  searchRentingRules,
  type StoredRentingRuleChunk,
  tokenize,
} from "./rentingRules";

function storedChunk(
  id: string,
  embedding: number[],
  text = `Text of ${id}.`,
): StoredRentingRuleChunk {
  return {
    id,
    title: "Bond amounts and payments",
    section: id,
    url: "https://www.consumer.vic.gov.au/housing/renting/bond",
    pageUpdated: "2026-09-28",
    text,
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

describe("tokenize", () => {
  it("lowercases, drops stop words and strips a final s", () => {
    expect(tokenize("How long to fix my broken Dishwashers?")).toEqual([
      "long",
      "fix",
      "broken",
      "dishwasher",
    ]);
  });

  it("keeps short words and double s endings intact", () => {
    expect(tokenize("Gas, bus and glass")).toEqual(["gas", "bus", "glass"]);
  });

  it("splits on curly apostrophes and drops the leftover", () => {
    expect(tokenize("They’re selling")).toEqual(["selling"]);
  });
});

describe("keywordScores", () => {
  const repairChunks = [
    storedChunk("dishwasher", [1, 0], "Repair a broken dishwasher soon."),
    storedChunk("heater", [1, 0], "Repair a broken heater urgently."),
    storedChunk("oven", [1, 0], "Repair a broken oven or repair the stove."),
    storedChunk("rent", [1, 0], "Rent is due every month."),
  ];

  it("scores a word found in one chunk above a word found in many", () => {
    const scores = keywordScores("broken dishwasher", repairChunks);
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);

    expect(ranked[0][0]).toBe("dishwasher");
    expect(scores.has("rent")).toBe(false);
  });

  it("gives a repeated word more score, with diminishing returns", () => {
    const scores = keywordScores("repair", repairChunks);

    expect(scores.get("oven")).toBeGreaterThan(scores.get("heater") ?? 0);
    expect(scores.get("oven")).toBeLessThan(2 * (scores.get("heater") ?? 0));
  });

  it("returns nothing for a question that shares no words", () => {
    expect(keywordScores("stamp duty", repairChunks).size).toBe(0);
  });
});

describe("fuseRankings", () => {
  it("adds 1 / (60 + rank) from each ranking", () => {
    const fused = fuseRankings([["a", "b"], ["b"]]);

    expect(fused.get("a")).toBeCloseTo(1 / 61);
    expect(fused.get("b")).toBeCloseTo(1 / 62 + 1 / 61);
  });

  it("puts an item near the top of both lists above one first in only one", () => {
    // Same shape as the dishwasher case: "rare-word" is 6th by vector but
    // 1st by keyword, "only-vector" is 1st by vector and has no keyword match.
    const fused = fuseRankings([
      ["only-vector", "both", "c", "d", "e", "rare-word"],
      ["rare-word", "both"],
    ]);
    const order = [...fused.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    expect(order.slice(0, 3)).toEqual(["both", "rare-word", "only-vector"]);
  });
});

describe("rankChunksHybrid", () => {
  const hybridChunks = [
    storedChunk("general", [1, 0, 0], "Repairs must be done in a timely way."),
    storedChunk("urgent", [0.95, 0.31, 0], "Urgent repairs include gas leaks."),
    storedChunk(
      "appliances",
      [0.9, 0.44, 0],
      "Fix a broken dishwasher in 14 days.",
    ),
    storedChunk("unrelated", [0, 1, 0], "The dishwasher in the photo is new."),
  ];

  it("moves a chunk sharing a rare word above closer vector matches", () => {
    const vectorOnly = rankChunks([1, 0, 0], hybridChunks, 3, 0.5);
    const hybrid = rankChunksHybrid(
      "broken dishwasher",
      [1, 0, 0],
      hybridChunks,
      3,
      0.5,
    );

    expect(vectorOnly.map((match) => match.id)).toEqual([
      "general",
      "urgent",
      "appliances",
    ]);
    expect(hybrid[0].id).toBe("appliances");
    // The score shown is still the cosine similarity.
    expect(hybrid[0].score).toBeCloseTo(
      cosineSimilarity([1, 0, 0], [0.9, 0.44, 0]),
    );
  });

  it("never returns a chunk below the similarity threshold", () => {
    const hybrid = rankChunksHybrid(
      "dishwasher",
      [1, 0, 0],
      hybridChunks,
      4,
      0.5,
    );

    expect(hybrid.map((match) => match.id)).not.toContain("unrelated");
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
