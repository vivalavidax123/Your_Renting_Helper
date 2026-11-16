// Deterministic checks for analyst answers. They call no API, so their
// results are stable and they are unit-tested in the normal test run.

import { walkingMetersPerMinute } from "@/app/lib/indicators";

export const maxAnswerWords = 220;

export function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

// Phrases that mean the answer leaked how the analyst is built.
const bannedPatterns = [
  /\bjson\b/i,
  /\bsystem prompt\b/i,
  /\bmy instructions\b/i,
];

export function findBannedPhrases(text: string) {
  return bannedPatterns
    .map((pattern) => text.match(pattern)?.[0])
    .filter((match): match is string => Boolean(match));
}

// The numbers a context actually contains, grouped by what they measure.
export type Evidence = {
  meters: number[];
  minutes: number[];
  plain: number[];
};

// Walks every value in the context. Numeric fields whose key ends in
// "Meters" are distances; every other number (scores, weights, counts,
// ratings) is plain. Strings such as "650 m", "1.2 km" or "8 min avg" are
// read too, because indicators carry their values as text.
export function collectEvidence(...contexts: unknown[]): Evidence {
  const evidence: Evidence = { meters: [], minutes: [], plain: [] };

  function visit(value: unknown, key: string) {
    if (typeof value === "number") {
      (key.endsWith("Meters") ? evidence.meters : evidence.plain).push(value);
    } else if (typeof value === "string") {
      for (const claim of findNumericClaims(value)) {
        evidence[claim.kind].push(claim.value);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key));
    } else if (value && typeof value === "object") {
      for (const [childKey, child] of Object.entries(value)) {
        visit(child, childKey);
      }
    }
  }

  contexts.forEach((context) => visit(context, ""));

  // The analyst may turn any distance into a walk time at the app's pace.
  for (const meters of evidence.meters) {
    evidence.minutes.push(Math.round(meters / walkingMetersPerMinute));
  }

  return evidence;
}

export type NumericClaim = {
  text: string;
  kind: keyof Evidence;
  value: number;
};

// A number followed by a unit: "650 m", "1.2km", "8-minute", "72/100", "28%".
// The lookahead stops "5 more" from reading as "5 m".
const claimPattern =
  /(\d[\d,]*(?:\.\d+)?)(?:\s|-)?(km|kilometres?|kilometers?|m|metres?|meters?|mins?|minutes?|%|\/100)(?![a-z])/gi;

export function findNumericClaims(text: string): NumericClaim[] {
  return [...text.matchAll(claimPattern)].map((match) => {
    const value = Number(match[1].replaceAll(",", ""));
    const unit = match[2].toLowerCase();

    if (unit.startsWith("k")) {
      return { text: match[0], kind: "meters", value: value * 1000 };
    }

    if (unit === "m" || unit.startsWith("met")) {
      return { text: match[0], kind: "meters", value };
    }

    if (unit.startsWith("min")) {
      return { text: match[0], kind: "minutes", value };
    }

    return { text: match[0], kind: "plain", value };
  });
}

// A claimed distance may be rounded ("0.7 km" for 650 m), so it only has to
// land within 10% (at least 50 m) of a real one. Walk times may be off by a
// minute. Plain numbers such as scores and weights must match exactly.
function isSupported(claim: NumericClaim, evidence: Evidence) {
  const candidates = evidence[claim.kind];

  if (claim.kind === "meters") {
    return candidates.some(
      (meters) => Math.abs(claim.value - meters) <= Math.max(50, meters * 0.1),
    );
  }

  if (claim.kind === "minutes") {
    return candidates.some((minutes) => Math.abs(claim.value - minutes) <= 1);
  }

  return candidates.includes(claim.value);
}

// Every number-with-a-unit in the answer that no context supports. An empty
// list means the answer invented no measurable facts.
export function findUnsupportedNumbers(answer: string, evidence: Evidence) {
  return findNumericClaims(answer)
    .filter((claim) => !isSupported(claim, evidence))
    .map((claim) => claim.text);
}
