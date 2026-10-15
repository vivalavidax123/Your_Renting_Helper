import { parseScoringOptions } from "@/app/lib/categories";
import { errorResponse, isJsonRecord, textResponse } from "@/app/lib/api";
import { auth } from "@/app/lib/auth";
import {
  compareLocations,
  getQuestionRefusal,
  LocationAnalystError,
  readQuestion,
} from "@/app/lib/services/locationAnalyst";
import { buildLocationAnalysisContext } from "@/app/lib/services/locationAnalysis";
import { areLocationsSavedByUser } from "@/app/lib/services/searchStore";

function readLocationIds(value: unknown): [string, string] | null {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every((id) => typeof id === "string" && id.trim().length > 0)
  ) {
    return null;
  }

  const locationIds: [string, string] = [value[0].trim(), value[1].trim()];
  return locationIds[0] === locationIds[1] ? null : locationIds;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Request body must be JSON." },
      { status: 400 },
    );
  }

  if (!isJsonRecord(body)) {
    return Response.json(
      { ok: false, error: "Request body must be an object." },
      { status: 400 },
    );
  }

  const locationIds = readLocationIds(body.locationIds);

  if (!locationIds) {
    return Response.json(
      { ok: false, error: "Choose two different saved locations." },
      { status: 400 },
    );
  }

  const input = readQuestion(body.question);

  if ("error" in input) {
    return Response.json({ ok: false, error: input.error }, { status: 400 });
  }

  const options = parseScoringOptions(body.profile, body.preset);

  if ("error" in options) {
    return Response.json({ ok: false, error: options.error }, { status: 400 });
  }

  const { question } = input;
  const { profile, preset } = options;

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return Response.json(
        { ok: false, error: "Sign in to compare saved locations." },
        { status: 401 },
      );
    }

    const saved = await areLocationsSavedByUser(session.user.id, locationIds);

    if (!saved) {
      return Response.json(
        {
          ok: false,
          error: "Both locations must be saved before comparing them.",
        },
        { status: 403 },
      );
    }

    const [locationA, locationB] = await Promise.all(
      locationIds.map((locationId) =>
        buildLocationAnalysisContext(locationId, profile, preset),
      ),
    );

    if (!locationA || !locationB) {
      return Response.json(
        { ok: false, error: "Location data was not found." },
        { status: 404 },
      );
    }

    const refusal = await getQuestionRefusal(question, "comparison");

    if (refusal) {
      return textResponse(refusal);
    }

    return textResponse(await compareLocations(locationA, locationB, question));
  } catch (error) {
    if (error instanceof LocationAnalystError) {
      return Response.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    return errorResponse(
      500,
      "Could not compare these locations.",
      "Location comparison chat failed:",
      error,
    );
  }
}
