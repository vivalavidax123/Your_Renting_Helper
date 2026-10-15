import { useCallback, useEffect, useState } from "react";
import { readApiResult } from "@/app/lib/api";
import type { RequestState, RecentSearch } from "@/app/lib/types";

function isHistoryPayload(value: Record<string, unknown>) {
  return Array.isArray(value.searches);
}

// Owns the recent-search and saved-location lists so every component that
// needs them (chips, comparison panel) reads the same single copy.
// userId is a dependency because both lists are user-relative: signing in
// or out must refetch so stars and the saved row reflect the new viewer.
export function useSavedSearches(
  placesState: RequestState,
  userId: string | null,
) {
  // A failed list load and a failed save/unsave are tracked apart: the next
  // successful load clears only its own error, so a toggle error stays
  // visible even though every toggle triggers a refetch.
  const [listError, setListError] = useState("");
  const [toggleError, setToggleError] = useState("");
  const [loadedSavedForUser, setLoadedSavedForUser] = useState<string | null>(
    null,
  );
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [saved, setSaved] = useState<RecentSearch[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refetch on mount, after each completed search, and after every
  // save/unsave (via refreshKey) so the database stays the single source
  // of truth instead of hand-edited local state.
  useEffect(() => {
    if (placesState === "loading") {
      return;
    }

    let cancelled = false;

    Promise.all([
      fetch("/api/history").then((response) =>
        readApiResult<{ searches: RecentSearch[] }>(response, isHistoryPayload),
      ),
      userId
        ? fetch("/api/favourites").then((response) =>
            readApiResult<{ searches: RecentSearch[] }>(
              response,
              isHistoryPayload,
            ),
          )
        : Promise.resolve({ ok: true as const, searches: [] }),
    ])
      .then(([historyData, favouritesData]) => {
        if (cancelled) {
          return;
        }

        if (historyData.ok) {
          setRecent(historyData.searches);
        }

        // Signed-out visitors skip /api/favourites; an empty list is the
        // correct rendering and avoids an unnecessary 401 request.
        if (favouritesData.ok) {
          setSaved(favouritesData.searches);
          setListError("");
        } else {
          setListError("Could not load saved locations.");
        }
        if (userId) {
          setLoadedSavedForUser(userId);
        }
      })
      .catch(() => {
        if (!cancelled && userId) {
          setListError("Could not load saved locations.");
          setLoadedSavedForUser(userId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [placesState, refreshKey, userId]);

  const toggleSaved = useCallback(async (search: RecentSearch) => {
    const isSaved = search.savedAt !== null;

    setToggleError("");
    try {
      const response = await fetch(
        isSaved ? `/api/favourites?id=${search.id}` : "/api/favourites",
        isSaved
          ? { method: "DELETE" }
          : {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ locationId: search.id }),
            },
      );
      const data = await readApiResult<Record<string, never>>(
        response,
        () => true,
      );
      if (!response.ok || !data.ok)
        throw new Error(
          data.ok ? "Could not update saved locations." : data.error,
        );
    } catch (error) {
      setToggleError(
        error instanceof Error
          ? error.message
          : "Could not update saved locations.",
      );
    } finally {
      setRefreshKey((key) => key + 1);
    }
  }, []);

  const savedPending = Boolean(userId && loadedSavedForUser !== userId);

  const savedError = toggleError || listError;

  return { recent, saved, toggleSaved, savedError, savedPending };
}
