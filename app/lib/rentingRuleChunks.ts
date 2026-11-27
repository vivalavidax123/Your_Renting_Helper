// Turns one curated renting-rules page (knowledge/renting/*.md) into the
// chunks the retriever searches. The ingest script runs this with plain Node
// (type stripping), so this file must stay free of imports: no "@/" alias,
// no "server-only".

export type RentingRulePage = {
  // File name without ".md", e.g. "bond". Becomes the start of chunk ids.
  slug: string;
  title: string;
  url: string;
  // The "last updated" date shown on the source page.
  pageUpdated: string;
  // The day the text was copied from the source page.
  retrievedAt: string;
  body: string;
};

export type RentingRuleChunk = {
  // "<page>#<section>", e.g. "bond#maximum-bond-amounts". Evals label
  // expected results with these ids, so they should stay stable.
  id: string;
  title: string;
  section: string;
  url: string;
  pageUpdated: string;
  text: string;
};

// Sections longer than this are split at paragraph breaks. Long chunks blur
// the meaning of the vector and cost more tokens when sent to the model.
export const maxChunkWords = 350;

const requiredFields = ["title", "url", "pageUpdated", "retrievedAt"] as const;

export function parseRentingRulePage(
  slug: string,
  markdown: string,
): RentingRulePage {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(
    markdown.replaceAll("\r\n", "\n"),
  );

  if (!match) {
    throw new Error(`${slug}.md has no front matter block.`);
  }

  const fields: Record<string, string> = {};

  for (const line of match[1].split("\n")) {
    const separator = line.indexOf(":");

    if (separator > 0) {
      fields[line.slice(0, separator).trim()] = line
        .slice(separator + 1)
        .trim();
    }
  }

  for (const field of requiredFields) {
    if (!fields[field]) {
      throw new Error(`${slug}.md is missing "${field}" in its front matter.`);
    }
  }

  if (!fields.url.startsWith("https://www.consumer.vic.gov.au/")) {
    throw new Error(`${slug}.md must link to a consumer.vic.gov.au page.`);
  }

  return {
    slug,
    title: fields.title,
    url: fields.url,
    pageUpdated: fields.pageUpdated,
    retrievedAt: fields.retrievedAt,
    body: match[2],
  };
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

// Splits a long section at paragraph breaks into parts of roughly equal size,
// so a 360-word section becomes two parts of about 180 words rather than 350
// and 10. A single paragraph is never cut mid-sentence.
function splitLongSection(text: string) {
  const total = countWords(text);

  if (total <= maxChunkWords) {
    return [text];
  }

  const target = total / Math.ceil(total / maxChunkWords);
  const parts: string[] = [];
  let current: string[] = [];
  let words = 0;

  for (const paragraph of text.split(/\n{2,}/)) {
    const paragraphWords = countWords(paragraph);

    if (current.length > 0 && words + paragraphWords / 2 > target) {
      parts.push(current.join("\n\n"));
      current = [];
      words = 0;
    }

    current.push(paragraph);
    words += paragraphWords;
  }

  if (current.length > 0) {
    parts.push(current.join("\n\n"));
  }

  return parts;
}

// One chunk per "##" section. CAV pages are already organised as one question
// per heading ("Maximum bond amounts"), so a heading and its paragraphs make a
// self-contained answer. "###" subheadings stay inside their section.
export function chunkRentingRulePage(page: RentingRulePage) {
  // Curation notes are HTML comments; they are for maintainers, not users.
  const body = page.body.replace(/<!--[\s\S]*?-->/g, "");
  const sections = body.split(/^## /m).slice(1);
  const chunks: RentingRuleChunk[] = [];
  const seenIds = new Set<string>();

  if (sections.length === 0) {
    throw new Error(`${page.slug}.md has no "## " sections.`);
  }

  for (const section of sections) {
    const newline = section.indexOf("\n");
    const heading = section.slice(0, newline).trim();
    const text = section.slice(newline + 1).trim();
    const baseId = `${page.slug}#${slugify(heading)}`;

    if (!text) {
      continue;
    }

    if (seenIds.has(baseId)) {
      throw new Error(`${page.slug}.md has two sections called "${heading}".`);
    }

    seenIds.add(baseId);

    splitLongSection(text).forEach((part, index) => {
      chunks.push({
        id: index === 0 ? baseId : `${baseId}-${index + 1}`,
        title: page.title,
        section: heading,
        url: page.url,
        pageUpdated: page.pageUpdated,
        text: part,
      });
    });
  }

  return chunks;
}

// The text that is turned into a vector. The page title and heading go first
// because short sections ("Pet bonds") say little on their own.
export function embeddingInput(chunk: RentingRuleChunk) {
  return `${chunk.title} > ${chunk.section}\n\n${chunk.text}`;
}
