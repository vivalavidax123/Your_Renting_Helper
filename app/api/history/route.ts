import { errorResponse } from "@/app/lib/api";
import { auth } from "@/app/lib/auth";
import {
  listRecentSearches,
  removeUserSearch,
} from "@/app/lib/services/searchStore";

// History is per-account. Signed-out visitors get an empty list rather than
// a 401, so the page can always call GET without checking the session first.
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const searches = await listRecentSearches(session?.user.id ?? null);
    return Response.json({ ok: true, searches });
  } catch (error) {
    return errorResponse(
      500,
      "Could not load recent searches.",
      "Loading recent searches failed:",
      error,
    );
  }
}

// DELETE /api/history?id=<locationId> removes one chip from the signed-in
// user's history. Deleting is only meaningful for a known user, so no
// session answers 401 (same rule as /api/favourites).
export async function DELETE(request: Request) {
  const locationId = new URL(request.url).searchParams.get("id");

  if (!locationId) {
    return Response.json(
      { ok: false, error: "id query parameter is required." },
      { status: 400 },
    );
  }

  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return Response.json(
        { ok: false, error: "Sign in to manage recent searches." },
        { status: 401 },
      );
    }

    await removeUserSearch(session.user.id, locationId);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(
      500,
      "Could not remove this search.",
      "Removing a recent search failed:",
      error,
    );
  }
}
