import type { WeightProfile } from "@/app/lib/categories";
import { auth } from "@/app/lib/auth";
import {
  areLocationsSavedByUser,
  getComparisonSide,
} from "@/app/lib/services/searchStore";

function isWeightProfile(value: string | null): value is WeightProfile {
  return value === "carFree" || value === "carOwner";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const aId = searchParams.get("a")?.trim();
  const bId = searchParams.get("b")?.trim();
  const requestedProfile = searchParams.get("profile");

  if (!aId || !bId) {
    return Response.json(
      { ok: false, error: "Both a and b location ids are required." },
      { status: 400 },
    );
  }

  if (aId === bId) {
    return Response.json(
      { ok: false, error: "Pick two different locations to compare." },
      { status: 400 },
    );
  }

  if (requestedProfile !== null && !isWeightProfile(requestedProfile)) {
    return Response.json(
      { ok: false, error: "Profile must be carFree or carOwner." },
      { status: 400 },
    );
  }

  const profile: WeightProfile = requestedProfile ?? "carFree";

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return Response.json(
        { ok: false, error: "Sign in to compare saved locations." },
        { status: 401 },
      );
    }

    const locationIds: [string, string] = [aId, bId];
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

    const [a, b] = await Promise.all([
      getComparisonSide(aId, profile),
      getComparisonSide(bId, profile),
    ]);

    if (!a || !b) {
      return Response.json(
        { ok: false, error: "One of the locations has no score data." },
        { status: 404 },
      );
    }

    return Response.json(
      { ok: true, a, b },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false, error: "Could not compare these locations." },
      { status: 500 },
    );
  }
}
