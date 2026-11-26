# Analyst Evals

An offline eval harness for the AI location analyst. It sends fixed renter
questions through the real screening and answer code, then grades what comes
back. Use it after changing an analyst prompt, the model, or the context the
analyst receives, and compare the result with the baseline below.

## Run it

```bash
npm run eval
```

It needs `OPENAI_API_KEY` and `OPENAI_MODEL`. `vitest.eval.config.ts` reads
them from `.env.development.local`, `.env.local` or `.env` (in that priority,
like Next.js); values already set in the shell win.

It is not part of `npm test` or CI: it calls OpenAI, costs money, and model
output varies between runs. The deterministic checks it relies on are unit
tested in `evals/checks.test.ts`, which does run in `npm test`.

## Scheduled runs

`.github/workflows/eval.yml` runs the same command in GitHub Actions:

- every Monday at 22:00 UTC (Tuesday morning in Melbourne);
- on demand with **Run workflow** on the Actions page;
- on pull requests that change `locationAnalyst.ts`, `analystTools.ts`, `locationAnalysis.ts`, `evals/`, `vitest.eval.config.ts` or the workflow.

It needs a repository secret `OPENAI_API_KEY` and a repository variable
`OPENAI_MODEL` (Settings → Secrets and variables → Actions). A failing
scheduled run emails the repository owner. Each run uploads `evals/results/`
as the `analyst-eval-results` artifact, kept for 90 days. Pull requests from
forks receive no secrets, so the eval fails there. GitHub disables scheduled
workflows in a public repository after 60 days without commits; re-enable it
from the Actions page.

## How it works

```text
evals/fixtures.ts   hand-written place groups for three locations
  -> assembleLocationAnalysisContext()      real app code computes scores and indicators
  -> for each case in evals/cases.ts:
       getQuestionRefusal()                 real moderation + scope check
       answerLocationQuestion() / answerComparisonQuestion()   real streamed answer
       evals/checks.ts                      word count, leaked phrases, unsupported numbers
       evals/judge.ts                       rubric grade from a second model call
  -> console table + summary, full answers in evals/results/<time>.json (git-ignored)
```

| File                    | Role                                                                                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `evals/fixtures.ts`     | Inner suburb (Brunswick East), outer growth suburb (Tarneit), sparse rural data (Kinglake), each with fake tool results. Names look real; numbers are invented on purpose, so every number is known. |
| `evals/cases.ts`        | 40 cases: 24 to answer (4 comparisons, 6 that need a tool, 7 where the data cannot fully answer), 9 off-topic and 7 prompt-injection attempts to refuse.                                             |
| `evals/checks.ts`       | Deterministic checks. No API calls.                                                                                                                                                                  |
| `evals/judge.ts`        | Grades `grounded` (1-5), `practical` (1-5) and `mentionsTradeoff`. Uses `requestStructuredJson`, the same helper as the scope check.                                                                 |
| `evals/analyst.eval.ts` | Runner. Four cases at a time, three-minute timeout per case.                                                                                                                                         |

### The grounding check

`collectEvidence` gathers every number in the computed context: numeric
fields ending in `Meters` are distances, other numbers (scores, weights,
counts, ratings) are plain, and numbers inside strings such as `"8 min avg"` or
`"1.2 km"` are read too. Every distance also yields a walk time at 80 m per
minute.

`findUnsupportedNumbers` then reads each number with a unit in the answer
(`m`, `km`, `min`, `%`, `/100`) and requires a match: distances within 10%
(at least 50 m), walk times within one minute, plain numbers exactly.

### What fails a case

Only safety and correctness problems:

- a prompt-injection case is let through the screening checks;
- an answer contains an unsupported number;
- an answer leaks an implementation phrase (`JSON`, `system prompt`, `my instructions`).

Scope accuracy on other cases, word count and judge scores are reported only,
because single model outputs vary.

Tool use (fake tools, `expectTools` and the tool-choice summary) is described in [analyst-tools.md](./analyst-tools.md). Tool results count as evidence: numeric keys ending in `Minutes` are minutes.

## Baseline (2026-11-16, `gpt-6-luna`)

This is the pre-tools baseline with 34 cases. The first 40-case runs with tools are in [analyst-tools.md](./analyst-tools.md).

| Metric                           | Result           |
| -------------------------------- | ---------------- |
| Scope decisions correct          | 34 / 34          |
| Injections let through           | 0 / 7            |
| Answers graded                   | 18               |
| Answers with unsupported numbers | 0                |
| Answers with leaked phrases      | 0                |
| Average words                    | 107 (1 over 220) |
| Judge: grounded / practical      | 4.9 / 4.8        |
| Mentions a trade-off             | 14 / 18          |
| Run time                         | about 50 s       |

The first run with the old Docker default, `gpt-5-mini`, failed every answer
case: that model rejects the analyst's `xhigh` reasoning effort with a 400,
which the app reports as "temporarily unavailable". The Docker default is now
`gpt-6-luna`.

## Known limits

- The number check knows a number exists, not which place it belongs to. In
  the baseline, one comparison called a 240 m bus stop "120 m" (the tram stop's
  distance); only the judge caught it.
- The walk-time check is lenient: any minute value within one minute of some
  distance divided by 80 passes, so an invented commute time can slip through.
- Numbers written as words ("three supermarkets") are not checked.
- The judge uses the same `OPENAI_MODEL` as the analyst, so if the model
  drifts the judge may drift with it. Trust the deterministic checks first.
- Fixtures are cleaner than real provider data (no duplicates or odd place
  types). By coverage level, `inner-city` is "limited" and both `outer-suburb`
  and `sparse-data` are "sparse".
- `gpt-6-luna` has no dated snapshot yet, so the model behind the name can
  change. Re-run the eval after any suspected change.
