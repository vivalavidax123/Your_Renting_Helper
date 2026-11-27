# Victorian renting guidance

Curated copies of Consumer Affairs Victoria (CAV) renting pages. The AI analyst's
renting rules search is built from these files.

© State of Victoria (Consumer Affairs Victoria). Used under the
[Creative Commons Attribution 4.0 International licence](https://creativecommons.org/licenses/by/4.0/).
The text has been shortened and lightly edited: rooming house, caravan park and
residential park rules, form download links and navigation text were removed.
Each file links to its source page.

Legislation text (the Residential Tenancies Act 1997) is not copied here, because
legislation.vic.gov.au does not license it for reuse.

## File format

```markdown
---
title: Page title as shown on CAV
url: https://www.consumer.vic.gov.au/...
pageUpdated: 2026-09-28 # the "Last updated" date on the CAV page
retrievedAt: 2026-11-27 # the day the text was copied
---

## One question or topic per heading

Text...
```

Each `##` section becomes one search chunk (long sections are split at paragraph
breaks). `<!-- comments -->` are curation notes and are not searched.

## Refreshing

1. Compare each page with the live CAV page and update the text, `pageUpdated` and
   `retrievedAt`.
2. Run `npm run ingest:renting` (needs `OPENAI_API_KEY`). It reports which pages
   changed and rewrites `app/lib/data/renting-rules.json`.
3. Run `npm test` (checks the JSON matches these files) and `npm run eval`
   (retrieval hit rate).
