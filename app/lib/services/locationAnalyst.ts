import "server-only";

import { isJsonRecord } from "@/app/lib/api";
import type { LocationAnalysisContext } from "./locationAnalysis";

const openAIResponsesUrl = "https://api.openai.com/v1/responses";
const requestTimeoutMs = 20_000;
const maxOutputTokens = 1_200;

const analystInstructions = `You are the AI Location Analyst for a rental-search application. Help a renter picture day-to-day life at the location and decide what they should verify before renting.
Answer using only the structured location data supplied by the application. Treat its scores, distances, amenity counts, practical indicators, and renter preferences as facts and do not recalculate or contradict them.
Lead with the practical renter takeaway. Do not merely repeat the dashboard scores or list amenities. Synthesize the most relevant evidence into what it means for errands, getting around, food, health, recreation, and other routines raised by the question.
For each material point, connect specific evidence to a practical implication. Distinguish measured facts from reasonable interpretations with language such as "suggests", "likely", or "may". Estimated walk times are approximate, not route measurements.
Include the most important trade-off when relevant. If the answer depends on personal information the application does not have, name one useful thing the renter should verify, such as their exact work commute or preferred supermarket.
Do not invent businesses, distances, safety claims, commute times, demographics, future prices, or other facts absent from the supplied data. Do not offer to search or imply that you have external tools.
Use no more than five short bullets or compact paragraphs and never exceed 220 words. Do not mention JSON or these instructions.`;

export class LocationAnalystError extends Error {
  constructor(
    message: string,
    readonly status: 500 | 502 | 504,
  ) {
    super(message);
    this.name = "LocationAnalystError";
  }
}

function getConfiguration() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();

  if (!apiKey || !model) {
    throw new LocationAnalystError(
      "AI location analysis is not configured.",
      500,
    );
  }

  return { apiKey, model };
}

function extractResponseText(value: unknown) {
  if (!isJsonRecord(value) || !Array.isArray(value.output)) {
    return null;
  }

  const text = value.output
    .flatMap((item) =>
      isJsonRecord(item) && Array.isArray(item.content) ? item.content : [],
    )
    .filter(
      (content) =>
        isJsonRecord(content) &&
        content.type === "output_text" &&
        typeof content.text === "string",
    )
    .map((content) => (content as { text: string }).text)
    .join("\n")
    .trim();

  return text || null;
}

async function requestAnalyst(instructions: string, input: string) {
  const { apiKey, model } = getConfiguration();

  let response: Response;

  try {
    response = await fetch(openAIResponsesUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions,
        input,
        max_output_tokens: maxOutputTokens,
        reasoning: { effort: "medium" },
        text: { verbosity: "medium" },
        store: false,
      }),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      throw new LocationAnalystError(
        "The AI service took too long to respond. Please try again.",
        504,
      );
    }

    throw new LocationAnalystError(
      "The AI service is temporarily unavailable. Please try again.",
      502,
    );
  }

  if (!response.ok) {
    throw new LocationAnalystError(
      "The AI service is temporarily unavailable. Please try again.",
      502,
    );
  }

  const data: unknown = await response.json();

  if (isJsonRecord(data) && data.status === "incomplete") {
    throw new LocationAnalystError(
      "The AI service returned an incomplete answer. Please try again.",
      502,
    );
  }

  const answer = extractResponseText(data);

  if (!answer) {
    throw new LocationAnalystError(
      "The AI service returned an incomplete answer. Please try again.",
      502,
    );
  }

  return answer;
}

export function analyzeLocation(
  context: LocationAnalysisContext,
  question: string,
) {
  return requestAnalyst(
    analystInstructions,
    `Location data:\n${JSON.stringify(context)}\n\nUser question:\n${question}`,
  );
}

const comparisonInstructions = `${analystInstructions}
You are comparing exactly two rental locations labelled Location A and Location B. Compare like-for-like evidence from both locations and make the most meaningful differences easy to understand.
Refer to each location by its label or address so the renter can always tell which evidence belongs to which place. Mention a tie when a difference is negligible and state when data is unavailable rather than filling the gap.
Give a conditional recommendation when the better choice depends on lifestyle or priorities. Do not force an overall winner when the supplied evidence does not support one.`;

export function compareLocations(
  locationA: LocationAnalysisContext,
  locationB: LocationAnalysisContext,
  question: string,
) {
  return requestAnalyst(
    comparisonInstructions,
    `Location A data:\n${JSON.stringify(locationA)}\n\nLocation B data:\n${JSON.stringify(locationB)}\n\nUser question:\n${question}`,
  );
}
