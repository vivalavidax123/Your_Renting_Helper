# Renting Rules Search

A small retrieval system over official Victorian renting guidance. It is the
first half of a planned analyst tool that answers questions like "how much bond
can they ask for?" with cited sources. This part covers the data and the
search. The analyst does not call it yet.

## Source and licence

The text comes from 17 Consumer Affairs Victoria (CAV) renting pages, copied
into `knowledge/renting/*.md` on 2026-11-27. CAV publishes its website under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), with the attribution
"© State of Victoria (Consumer Affairs Victoria)". The copies are shortened:
rooming house, caravan park and residential park rules, form links and
navigation text are removed. Each file records its source URL, the page's own
"last updated" date, and the day it was copied.

The Residential Tenancies Act 1997 itself is not copied. legislation.vic.gov.au
publishes legislation "for personal use only", with no reuse licence.

Topics: bonds and bond refunds, rent increases and challenging them, rent
payments and arrears, condition reports, repairs, minimum standards, pets,
renter modifications, rental provider entry, notices to vacate, renter notice,
breaking a lease, disputes, and CAV's list of recent law changes.

## Pipeline

```text
knowledge/renting/*.md
   |  npm run ingest:renting   (scripts/ingest-renting-rules.ts, needs OPENAI_API_KEY)
   |    1. parse front matter          app/lib/rentingRuleChunks.ts
   |    2. one chunk per "##" section; sections over 350 words split
   |       at paragraph breaks into parts of similar size
   |    3. embed "<page title> > <heading>\n\n<text>" for every chunk
   |       in one call: text-embedding-3-small, 512 dimensions
   v
app/lib/data/renting-rules.json   (generated, committed, about 550 KB)
```

The script prints which pages are new, changed or removed since the last run.
`npm run ingest:renting -- --check` chunks the pages without calling OpenAI.
The script runs with plain Node type stripping, so the chunker has no imports
and `tsconfig.json` allows `.ts` import paths.

A unit test re-chunks the markdown and checks that the committed JSON matches,
so editing a page without re-running the ingest fails `npm test`.

Current size: 17 pages, 104 chunks (median about 120 words), 16,605 tokens to
embed.

## Search

`searchRentingRules(query, limit = 4)` in `app/lib/services/rentingRules.ts`:

1. embeds the query with the model and size recorded in the JSON, through
   `requestEmbedding` in `locationAnalyst.ts` (same timeout and error handling
   as the other OpenAI calls)
2. computes cosine similarity with all 104 chunk vectors in memory
3. keeps chunks scoring at least 0.4 and returns the best 4

Comparing against every chunk takes well under a millisecond at this size, so
there is no vector database. If the guidance grows to many thousands of chunks,
only this file needs to change (for example to Postgres with pgvector).

## Retrieval eval

`evals/retrieval.eval.ts` runs 28 labelled renter questions (each lists the
chunk ids that answer it) and 3 questions the guidance does not cover, using
real query embeddings. It runs under `npm run eval` and in the eval workflow.
It fails when the hit rate at 4 drops below 85%.

First run, 2026-11-27, threshold 0.3:

| Metric                              | Result        |
| ----------------------------------- | ------------- |
| Hit rate at 4 (covered questions)   | 26 / 28 (93%) |
| MRR                                 | 0.88          |
| Uncovered questions with no results | 0 / 3         |

Misses:

- "How long does the landlord have to fix a broken dishwasher?" The answer
  chunk contains the words "broken dishwasher", but four other repair
  sections scored slightly higher (0.50 to 0.52). This is the case keyword
  search would catch; add it if the weekly runs keep showing exact-term misses.
- "They're selling the house and want us out. How much notice?" The renter
  notice sections ranked above the notice-to-vacate table.

Unrelated questions (coffee, stamp duty, tax deductions) still scored up to
0.54, overlapping relevant questions (about 0.5 to 0.6). A similarity
threshold cannot reliably separate "not covered" from "covered", so the
threshold was raised to 0.4 only to drop clearly unrelated matches. Deciding
whether the returned text actually answers the question is left to the
analyst, which reads it.

## Known limits

- CAV pages can disagree with each other. On 2026-11-27 the notice-to-vacate
  page still described notices without a reason at the end of a first fixed
  term, while the law-changes page says no fault evictions are banned from
  25 November 2025. The copy follows the law-changes page and keeps a curation
  comment in the file.
- The data is a snapshot. Refresh steps are in `knowledge/renting/README.md`.
- Not done yet: the analyst tool, citations in the chat, the "not legal advice"
  notice, and answer evals for rules questions.
