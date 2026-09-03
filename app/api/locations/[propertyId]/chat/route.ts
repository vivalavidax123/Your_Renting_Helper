import type { WeightProfile } from "@/app/lib/categories";
import { isJsonRecord } from "@/app/lib/api";
import {
  analyzeLocation,
  LocationAnalystError,
} from "@/app/lib/services/locationAnalyst";
import { buildLocationAnalysisContext } from "@/app/lib/services/locationAnalysis";

const maxQuestionLength = 1_000;

function isWeightProfile(value: unknown): value is WeightProfile {
  return value === "carFree" || value === "carOwner";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ propertyId: string }> },
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Request body must be JSON." },
      { status: 400 },
    );
  }

  if (!isJsonRecord(body) || typeof body.question !== "string") {
    return Response.json(
      { ok: false, error: "Question is required." },
      { status: 400 },
    );
  }

  const question = body.question.trim();

  if (!question) {
    return Response.json(
      { ok: false, error: "Question is required." },
      { status: 400 },
    );
  }

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

  const { propertyId } = await params;
  const profile = body.profile ?? "carFree";

  try {
    const context = await buildLocationAnalysisContext(propertyId, profile);

    if (!context) {
      return Response.json(
        { ok: false, error: "Location data was not found." },
        { status: 404 },
      );
    }

    const answerStream = await analyzeLocation(context, question);

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
      { ok: false, error: "Could not analyse this location." },
      { status: 500 },
    );
  }
}
