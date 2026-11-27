import { describe, expect, it } from "vitest";

import {
  chunkRentingRulePage,
  embeddingInput,
  maxChunkWords,
  parseRentingRulePage,
} from "./rentingRuleChunks";

const frontMatter = `---
title: Bond amounts and payments
url: https://www.consumer.vic.gov.au/housing/renting/bond
pageUpdated: 2026-09-28
retrievedAt: 2026-11-27
---
`;

function page(body: string) {
  return parseRentingRulePage("bond", frontMatter + body);
}

describe("parseRentingRulePage", () => {
  it("reads the front matter and keeps the body", () => {
    const parsed = page("\n## What is a bond?\n\nA payment.\n");

    expect(parsed).toMatchObject({
      slug: "bond",
      title: "Bond amounts and payments",
      url: "https://www.consumer.vic.gov.au/housing/renting/bond",
      pageUpdated: "2026-09-28",
      retrievedAt: "2026-11-27",
    });
    expect(parsed.body).toContain("## What is a bond?");
  });

  it("accepts Windows line endings", () => {
    const parsed = parseRentingRulePage(
      "bond",
      `${frontMatter}\n## Heading\n\nText.\n`.replaceAll("\n", "\r\n"),
    );

    expect(parsed.title).toBe("Bond amounts and payments");
  });

  it("rejects a page without front matter or with a missing field", () => {
    expect(() => parseRentingRulePage("bond", "## Heading\n")).toThrow(
      "no front matter",
    );
    expect(() =>
      parseRentingRulePage(
        "bond",
        frontMatter.replace("pageUpdated: 2026-09-28\n", ""),
      ),
    ).toThrow('missing "pageUpdated"');
  });

  it("only accepts Consumer Affairs Victoria sources", () => {
    expect(() =>
      parseRentingRulePage(
        "bond",
        frontMatter.replace("www.consumer.vic.gov.au", "example.com"),
      ),
    ).toThrow("consumer.vic.gov.au");
  });
});

describe("chunkRentingRulePage", () => {
  it("makes one chunk per ## section with a stable id", () => {
    const chunks = chunkRentingRulePage(
      page(
        "\n## What is a bond?\n\nA payment.\n\n### Detail\n\nMore.\n\n## Maximum bond amounts\n\nOne month’s rent.\n",
      ),
    );

    expect(chunks.map((chunk) => chunk.id)).toEqual([
      "bond#what-is-a-bond",
      "bond#maximum-bond-amounts",
    ]);
    expect(chunks[0]).toMatchObject({
      title: "Bond amounts and payments",
      section: "What is a bond?",
      pageUpdated: "2026-09-28",
      text: "A payment.\n\n### Detail\n\nMore.",
    });
  });

  it("drops curation notes written as HTML comments", () => {
    const [chunk] = chunkRentingRulePage(
      page("\n## Heading\n\nKept.\n\n<!-- Maintainer note. -->\n"),
    );

    expect(chunk.text).toBe("Kept.");
  });

  it("splits a long section into balanced parts at paragraph breaks", () => {
    const paragraph = Array.from({ length: 60 }, () => "word").join(" ");
    const text = Array.from({ length: 7 }, () => paragraph).join("\n\n");
    const chunks = chunkRentingRulePage(page(`\n## Long section\n\n${text}\n`));
    const words = chunks.map((chunk) => chunk.text.split(/\s+/).length);

    expect(chunks.map((chunk) => chunk.id)).toEqual([
      "bond#long-section",
      "bond#long-section-2",
    ]);
    expect(Math.max(...words)).toBeLessThanOrEqual(maxChunkWords);
    expect(Math.abs(words[0] - words[1])).toBeLessThanOrEqual(60);
  });

  it("rejects duplicate headings and pages without sections", () => {
    expect(() =>
      chunkRentingRulePage(page("\n## Same\n\nA.\n\n## Same\n\nB.\n")),
    ).toThrow("two sections");
    expect(() => chunkRentingRulePage(page("\nJust text.\n"))).toThrow("no");
  });
});

describe("embeddingInput", () => {
  it("puts the page title and heading before the text", () => {
    const [chunk] = chunkRentingRulePage(
      page("\n## Pet bonds\n\nNot allowed.\n"),
    );

    expect(embeddingInput(chunk)).toBe(
      "Bond amounts and payments > Pet bonds\n\nNot allowed.",
    );
  });
});
