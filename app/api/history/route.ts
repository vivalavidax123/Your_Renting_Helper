import { listRecentSearches } from "@/app/lib/services/searchStore";

export async function GET() {
  try {
    const searches = await listRecentSearches();
    return Response.json({ ok: true, searches });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load recent searches.",
      },
      { status: 500 },
    );
  }
}
