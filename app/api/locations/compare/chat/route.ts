import { isWeightPreset, isWeightProfile } from "@/app/lib/categories";
import { errorResponse, isJsonRecord } from "@/app/lib/api";
import { auth } from "@/app/lib/auth";
import {
  compareLocations,
  isLocationQuestionInScope,
  isLocationQuestionSafe,
  LocationAnalystError,
} from "@/app/lib/services/locationAnalyst";
import { buildLocationAnalysisContext } from "@/app/lib/services/locationAnalysis";
import { areLocationsSavedByUser } from "@/app/lib/services/searchStore";

const maxQuestionLength = 1_000;

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

  if (typeof body.question !== "string" || !body.question.trim()) {
    return Response.json(
      { ok: false, error: "Question is required." },
      { status: 400 },
    );
  }

  const question = body.question.trim();

  if (question.length > maxQuestionLength) {
    return Response.json(
      { ok: false, error: "Question must be 1,000 characters or fewer." },
      { status: 400 },
    );
  }

  if (body.profile !== undefined && !isWeightProfile(body.profile)) {
    return Response.json(
      { ok: false, error: "Profile must be carFree or carOwner." },
      { status: 400 },
    );
  }

  if (body.preset !== undefined && !isWeightPreset(body.preset)) {
    return Response.json(
      {
        ok: false,
        error: "Preset must be balanced, student, family or commuter.",
      },
      { status: 400 },
    );
  }

  const profile = body.profile ?? "carFree";
  const preset = body.preset ?? "balanced";

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

    if (!(await isLocationQuestionSafe(question))) {
      return new Response(
        "I can’t help with that request. Ask about the selected locations or renting instead.",
        {
          headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "text/plain; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }

    if (!(await isLocationQuestionInScope(question, "comparison"))) {
      return new Response(
        "I can only answer questions about the selected locations, nearby amenities, transport, rental evidence, and renting trade-offs.",
        {
          headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "text/plain; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }

    const answerStream = await compareLocations(locationA, locationB, question);

    return new Response(answerStream, {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
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
