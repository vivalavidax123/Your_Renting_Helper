import type { WeightProfile } from "@/app/lib/categories";
import { isJsonRecord } from "@/app/lib/api";
import { auth } from "@/app/lib/auth";
import {
  compareLocations,
  LocationAnalystError,
} from "@/app/lib/services/locationAnalyst";
import { buildLocationAnalysisContext } from "@/app/lib/services/locationAnalysis";
import { areLocationsSavedByUser } from "@/app/lib/services/searchStore";

const maxQuestionLength = 1_000;

function isWeightProfile(value: unknown): value is WeightProfile {
  return value === "carFree" || value === "carOwner";
}

function readPropertyIds(value: unknown): [string, string] | null {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every((id) => typeof id === "string" && id.trim().length > 0)
  ) {
    return null;
  }

  const propertyIds: [string, string] = [value[0].trim(), value[1].trim()];
  return propertyIds[0] === propertyIds[1] ? null : propertyIds;
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

  const propertyIds = readPropertyIds(body.propertyIds);

  if (!propertyIds) {
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

  const profile = body.profile ?? "carFree";

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return Response.json(
        { ok: false, error: "Sign in to compare saved locations." },
        { status: 401 },
      );
    }

    const saved = await areLocationsSavedByUser(session.user.id, propertyIds);

    if (!saved) {
      return Response.json(
        { ok: false, error: "Both locations must be saved before comparing them." },
        { status: 403 },
      );
    }

    const [locationA, locationB] = await Promise.all(
      propertyIds.map((propertyId) =>
        buildLocationAnalysisContext(propertyId, profile),
      ),
    );

    if (!locationA || !locationB) {
      return Response.json(
        { ok: false, error: "Location data was not found." },
        { status: 404 },
      );
    }

    const answerStream = await compareLocations(
      locationA,
      locationB,
      question,
    );

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

    return Response.json(
      { ok: false, error: "Could not compare these locations." },
      { status: 500 },
    );
  }
}
