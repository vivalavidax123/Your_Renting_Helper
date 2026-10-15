import { parseScoringOptions } from "@/app/lib/categories";
import { errorResponse, isJsonRecord, textResponse } from "@/app/lib/api";
import { auth } from "@/app/lib/auth";
import {
  answerLocationQuestion,
  getQuestionRefusal,
  LocationAnalystError,
  readQuestion,
} from "@/app/lib/services/locationAnalyst";
import { loadLocationAnalysisContext } from "@/app/lib/services/locationAnalysis";

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

  if (!isJsonRecord(body)) {
    return Response.json(
      { ok: false, error: "Question is required." },
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
  const { locationId } = await params;

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return Response.json(
        { ok: false, error: "Sign in to ask about this location." },
        { status: 401 },
      );
    }

    const context = await loadLocationAnalysisContext(
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

    const refusal = await getQuestionRefusal(question, "single");

    if (refusal) {
      return textResponse(refusal);
    }

    return textResponse(await answerLocationQuestion(context, question));
  } catch (error) {
    if (error instanceof LocationAnalystError) {
      return Response.json(
        { ok: false, error: error.message },
        { status: error.status },
      );
    }

    return errorResponse(
      500,
      "Could not analyse this location.",
      "Location analysis failed:",
      error,
    );
  }
}
