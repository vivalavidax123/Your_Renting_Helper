import { isWeightPreset, isWeightProfile } from "@/app/lib/categories";
import { isJsonRecord } from "@/app/lib/api";
import { auth } from "@/app/lib/auth";
import {
  analyzeLocation,
  isLocationQuestionInScope,
  isLocationQuestionSafe,
  LocationAnalystError,
} from "@/app/lib/services/locationAnalyst";
import { buildLocationAnalysisContext } from "@/app/lib/services/locationAnalysis";

const maxQuestionLength = 1_000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> },
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

  if (body.preset !== undefined && !isWeightPreset(body.preset)) {
    return Response.json(
      {
        ok: false,
        error: "Preset must be balanced, student, family or commuter.",
      },
      { status: 400 },
    );
  }

  const { locationId } = await params;
  const profile = body.profile ?? "carFree";
  const preset = body.preset ?? "balanced";

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return Response.json(
        { ok: false, error: "Sign in to ask about this location." },
        { status: 401 },
      );
    }

    const context = await buildLocationAnalysisContext(
      locationId,
      profile,
      preset,
    );

    if (!context) {
      return Response.json(
        { ok: false, error: "Location data was not found." },
        { status: 404 },
      );
    }

    if (!(await isLocationQuestionSafe(question))) {
      return new Response(
        "I can’t help with that request. Ask about the selected location or renting instead.",
        {
          headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "text/plain; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }

    if (!(await isLocationQuestionInScope(question, "single"))) {
      return new Response(
        "I can only answer questions about the selected location, nearby amenities, transport, rental evidence, and renting trade-offs.",
        {
          headers: {
            "Cache-Control": "no-cache",
            "Content-Type": "text/plain; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
          },
        },
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
