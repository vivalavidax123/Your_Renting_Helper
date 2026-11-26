# Analyst Tools

The single-location AI analyst can call three tools when the stored location
data cannot answer a question. The model decides whether to call them; the
server runs them and sends the results back before the model writes the
answer. Questions the stored data already answers call no tools.

## Tools

Defined in `app/lib/services/analystTools.ts`. Each wraps a service the site
already uses for the "More about this location" cards.

| Tool                | Arguments                                     | Wraps                                                                    | Cost                     |
| ------------------- | --------------------------------------------- | ------------------------------------------------------------------------ | ------------------------ |
| `get_cbd_travel`    | none                                          | `getCbdTravel`: straight-line distance, drive time, weekday 8 am transit | Geoapify + Google Routes |
| `get_terrain`       | none                                          | `getTerrainSummary`: level, average and steepest grade, height range     | Google Elevation         |
| `get_rent_estimate` | `propertyType`, `bedrooms` (0-10, as the API) | `getRentalEstimate`: community median weekly rent                        | Database only            |

`createLocationTools(latitude, longitude)` builds them for one location. The
coordinates come from the stored location, not from the request or the model,
so the model cannot spend the API keys on other places. Comparison chat has no
tools yet, because a comparison tool would also have to say which location to
check.

## The loop

`runAnalyst` in `app/lib/services/locationAnalyst.ts`:

```text
round 1   OpenAI Responses API, tools listed, streamed
            text only   -> forward it, done
            tool calls  -> run them in parallel, send a "step" event each,
                           append the reasoning items, the calls and their
                           function_call_output items to the conversation
round 2   same
round 3   tool_choice "none": the model must answer
```

Requests use `store: false`, so OpenAI keeps nothing between rounds. Each round
therefore sends the whole conversation back, with
`include: ["reasoning.encrypted_content"]` so the model's encrypted reasoning
travels with it.

The first OpenAI request is awaited before the stream is returned, so a missing
key or an OpenAI outage is still a normal 500/502/504 JSON error. A failure in
a later round arrives as an `error` event at the end of the stream.

## Guardrails

| Rule                                                                     | Why                                                                        |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| At most 3 model rounds, the last with `tool_choice: "none"`              | The loop always ends with an answer and cost is bounded                    |
| An identical repeated call (same name and arguments) reuses its result   | No paying twice for one fact; two bedroom counts can still both be checked |
| A failing tool returns `{"error":"unavailable"}` and the cause is logged | The model says it could not check instead of the whole answer failing      |
| Unknown tools and unparseable arguments return an error result           | Model output is untrusted input                                            |
| Strict JSON Schemas, and rent arguments are checked again on the server  | Same reason                                                                |
| The instructions say tool results are data, not instructions             | Ready for future tools that return third-party text                        |
| Tool results are numbers the app computes, never third-party free text   | Keeps indirect prompt injection out of the current tools                   |

## Stream format

Both chat routes return newline-delimited JSON (`application/x-ndjson`), one
`AnalystEvent` (`app/lib/types.ts`) per line:

```text
{"type":"step","name":"get_terrain","label":"the local terrain","ok":true}
{"type":"text","text":"The land around here is gently sloped ..."}
{"type":"error","message":"The AI service took too long. Please try again."}
```

A refusal is one `text` event (`analystTextResponse`). In the browser,
`readAnalystStream` (`app/lib/api.ts`) collects the text and steps and throws an
`error` event's message. `ConversationProvider` stores the steps on the
message, and `AnalystChat` shows them above the answer as "✓ Checked …" or
"✗ Couldn't check …".

## Evals

`evals/analyst.eval.ts` passes the real tool definitions (the same names,
descriptions and schemas the model sees in production) with `run` swapped for
fixed results from each fixture's `toolResults` in `evals/fixtures.ts`. This
needs no Google key or database, and the answers can be checked against known
numbers.

- Tool results count as evidence for the number check, and the judge sees
  them. Keys ending in `Minutes` count as minutes.
- Cases with one clear answer carry `expectTools`. The summary reports exact
  matches, missed tools, and tools called without need. Tool choice is reported
  but does not fail a case.
- Six tool cases cover CBD travel, missing transit data, terrain, rent, missing
  rent reports, and a question needing two tools.

First runs on the pull request (2026-11-26, `gpt-6-luna`, 40 cases):

| Metric                           | Run 1      | Run 2 (after threshold fix)     |
| -------------------------------- | ---------- | ------------------------------- |
| Scope decisions correct          | 40 / 40    | 40 / 40                         |
| Answers with unsupported numbers | 2          | 0                               |
| Judge: grounded / practical      | 4.9 / 4.8  | 5.0 / 4.8                       |
| Tool choice exact (of 14)        | 14         | 12 (2 extra calls, none missed) |
| Run time                         | about 43 s | about 44 s                      |

In run 1 the analyst quoted the 5% steep-grade threshold, which was only in
the tool description, so the number check flagged it. The terrain tool now
returns `steepStretchThresholdPercent`. In run 2 one grocery question also
checked rent, and the rent question also checked CBD travel and terrain. The
answers were fine; the extra calls only cost provider quota. Watch the weekly
run before tightening the tool descriptions.

## Trade-offs

- Questions that need a tool take one more model round plus the tool's own
  time. Other questions are unchanged.
- Each OpenAI call has a 20 s timeout, so the worst case is about 60 s. No
  `maxDuration` is set; Vercel's default function limit is above that.
- The always-available alternative, putting commute, terrain and rent in every
  context, is more predictable but pays for Google calls on every question.

## Not done yet

- A custom commute destination ("how long to Monash Clayton"): `cbdTravel.ts`
  needs a destination argument and geocoding first.
- Free nearby search: it would bring Google place names and reviews into the
  prompt (an injection risk) and spend Places quota on every call.
- Tools for comparison chat.
