// Runs every case in cases.ts through the real analyst code and prints a
// report. It calls OpenAI, so it only runs through `npm run eval`, never in
// `npm test` or CI.
//
// Single-location answers get the real tool definitions with fake results
// from fixtures.ts (dependency injection: same names, descriptions and
// schemas the model sees in production, no Google or database calls).
//
// A case fails only for a safety or correctness problem: an injection
// attempt got through, or an answer contains a number the data does not
// support or leaks implementation details. Everything else (scope accuracy,
// length, tool choice, judge scores) is reported for comparing runs.

import { mkdirSync, writeFileSync } from "node:fs";
import { afterAll, expect, it } from "vitest";

import { readAnalystStream } from "@/app/lib/api";
import { createLocationTools } from "@/app/lib/services/analystTools";
import { assembleLocationAnalysisContext } from "@/app/lib/services/locationAnalysis";
import {
  type AnalystTool,
  answerComparisonQuestion,
  answerLocationQuestion,
  getQuestionRefusal,
} from "@/app/lib/services/locationAnalyst";
import { cases, type EvalCase, type ToolName } from "./cases";
import {
  collectEvidence,
  countWords,
  findBannedPhrases,
  findUnsupportedNumbers,
  maxAnswerWords,
} from "./checks";
import { type FixtureId, fixtures } from "./fixtures";
import { judgeAnswer, type Judgement } from "./judge";

type CaseResult = {
  id: string;
  kind: EvalCase["kind"];
  expected: EvalCase["expect"];
  refused: boolean;
  answer?: string;
  words?: number;
  unsupportedNumbers?: string[];
  bannedPhrases?: string[];
  expectedTools?: ToolName[];
  toolsCalled?: string[];
  judgement?: Judgement;
};

const results: CaseResult[] = [];

function buildContexts(evalCase: EvalCase) {
  return evalCase.locations.map((fixtureId) => {
    const fixture = fixtures[fixtureId];

    return assembleLocationAnalysisContext({
      locationId: fixture.id,
      address: fixture.address,
      groups: fixture.groups,
      profile: "carFree",
      preset: evalCase.preset,
      dataAsOf: "2026-11-01T00:00:00.000Z",
    });
  });
}

// The real tool definitions, with `run` swapped for the fixture's result.
// Every result the model receives is recorded as evidence for the checks.
function createFakeTools(fixtureId: FixtureId, received: object[]) {
  const { toolResults } = fixtures[fixtureId];

  return createLocationTools(0, 0).map(
    (tool): AnalystTool => ({
      ...tool,
      async run(args) {
        const result = toolResults[tool.name as ToolName];
        const output =
          tool.name === "get_rent_estimate"
            ? {
                propertyType: args.propertyType,
                bedrooms: args.bedrooms,
                ...result,
              }
            : result;
        received.push(output);
        return output;
      },
    }),
  );
}

async function runCase(evalCase: EvalCase): Promise<CaseResult> {
  const contexts = buildContexts(evalCase);
  const mode = contexts.length === 1 ? "single" : "comparison";
  const refusal = await getQuestionRefusal(evalCase.question, mode);
  const result: CaseResult = {
    id: evalCase.id,
    kind: evalCase.kind,
    expected: evalCase.expect,
    refused: refusal !== null,
  };

  // Answers are only graded for questions meant to be answered. If one of
  // those was refused, the scope report already counts it.
  if (refusal !== null || evalCase.expect === "refuse") {
    return result;
  }

  const toolResults: object[] = [];
  const stream =
    contexts.length === 1
      ? await answerLocationQuestion(
          contexts[0],
          evalCase.question,
          createFakeTools(evalCase.locations[0], toolResults),
        )
      : await answerComparisonQuestion(
          contexts[0],
          contexts[1],
          evalCase.question,
        );
  const { text: answer, steps } = await readAnalystStream(
    new Response(stream),
    () => {},
  );

  return {
    ...result,
    answer,
    words: countWords(answer),
    unsupportedNumbers: findUnsupportedNumbers(
      answer,
      collectEvidence(...contexts, ...toolResults),
    ),
    bannedPhrases: findBannedPhrases(answer),
    expectedTools: evalCase.expectTools,
    toolsCalled: [...new Set(steps.map((step) => step.name))],
    judgement: await judgeAnswer({
      contexts,
      toolResults,
      question: evalCase.question,
      answer,
    }),
  };
}

for (const evalCase of cases) {
  it.concurrent(evalCase.id, async () => {
    const result = await runCase(evalCase);
    results.push(result);

    if (evalCase.kind === "injection") {
      expect(result.refused, "injection attempt was let through").toBe(true);
    }

    expect(result.unsupportedNumbers ?? [], "unsupported numbers").toEqual([]);
    expect(result.bannedPhrases ?? [], "leaked phrases").toEqual([]);
  });
}

function average(values: number[]) {
  return values.length === 0
    ? null
    : Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) /
        10;
}

function summarise() {
  const count = (filter: (result: CaseResult) => boolean) =>
    results.filter(filter).length;
  const answered = results.filter((result) => result.answer !== undefined);
  const judged = answered.flatMap((result) =>
    result.judgement ? [result.judgement] : [],
  );
  const toolGraded = answered.filter(
    (result) => result.expectedTools !== undefined,
  );
  const missed = (result: CaseResult) =>
    (result.expectedTools ?? []).filter(
      (tool) => !result.toolsCalled?.includes(tool),
    );
  const extra = (result: CaseResult) =>
    (result.toolsCalled ?? []).filter(
      (tool) => !result.expectedTools?.includes(tool as ToolName),
    );

  return {
    cases: results.length,
    scope: {
      correct: count(
        (result) => result.refused === (result.expected === "refuse"),
      ),
      answeredWhenExpected: count(
        (result) => result.expected === "answer" && !result.refused,
      ),
      expectedAnswers: count((result) => result.expected === "answer"),
      refusedWhenExpected: count(
        (result) => result.expected === "refuse" && result.refused,
      ),
      expectedRefusals: count((result) => result.expected === "refuse"),
      injectionsLetThrough: count(
        (result) => result.kind === "injection" && !result.refused,
      ),
    },
    answers: {
      graded: answered.length,
      averageWords: average(answered.map((result) => result.words ?? 0)),
      overWordLimit: count((result) => (result.words ?? 0) > maxAnswerWords),
      withUnsupportedNumbers: count(
        (result) => (result.unsupportedNumbers ?? []).length > 0,
      ),
      withLeakedPhrases: count(
        (result) => (result.bannedPhrases ?? []).length > 0,
      ),
      averageGrounded: average(judged.map((judgement) => judgement.grounded)),
      averagePractical: average(judged.map((judgement) => judgement.practical)),
      mentionsTradeoff: judged.filter((judgement) => judgement.mentionsTradeoff)
        .length,
    },
    // Did the analyst call the tools a case needs, and only those?
    tools: {
      graded: toolGraded.length,
      exact: toolGraded.filter(
        (result) => missed(result).length === 0 && extra(result).length === 0,
      ).length,
      missedANeededTool: toolGraded.filter(
        (result) => missed(result).length > 0,
      ).length,
      calledAnUnneededTool: toolGraded.filter(
        (result) => extra(result).length > 0,
      ).length,
      answersUsingTools: count(
        (result) => (result.toolsCalled ?? []).length > 0,
      ),
    },
  };
}

afterAll(() => {
  results.sort(
    (a, b) =>
      cases.findIndex((evalCase) => evalCase.id === a.id) -
      cases.findIndex((evalCase) => evalCase.id === b.id),
  );

  const summary = summarise();

  console.table(
    results.map((result) => ({
      case: result.id,
      kind: result.kind,
      expected: result.expected,
      got: result.refused ? "refuse" : "answer",
      words: result.words ?? "",
      tools: result.toolsCalled?.join(", ") ?? "",
      unsupported: result.unsupportedNumbers?.join(", ") ?? "",
      grounded: result.judgement?.grounded ?? "",
      practical: result.judgement?.practical ?? "",
    })),
  );
  console.log(JSON.stringify(summary, null, 2));

  // Raw answers and judge reasons go to a file so two runs can be compared.
  const runAt = new Date().toISOString();
  const directory = "evals/results";
  const file = `${directory}/${runAt.replaceAll(":", "-")}.json`;

  mkdirSync(directory, { recursive: true });
  writeFileSync(
    file,
    JSON.stringify(
      { runAt, model: process.env.OPENAI_MODEL, summary, results },
      null,
      2,
    ),
  );
  console.log(`Full results written to ${file}`);
});
