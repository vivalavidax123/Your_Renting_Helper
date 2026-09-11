import { useCallback, useEffect, useState } from "react";
import { readApiResult } from "../lib/api";
import type {
  RequestState,
  RecentSearch,
} from "../lib/types";

function isHistoryPayload(value: Record<string, unknown>) {
  return Array.isArray(value.searches);
}

// Owns the recent-search and saved-location lists so every component that
// needs them (chips, comparison panel) reads the same single copy.
// userId is a dependency because both lists are user-relative: signing in
// or out must refetch so stars and the saved row reflect the new viewer.
export function useSavedSearches(placesState: RequestState, userId: string | null) {
  const [savedError, setSavedError] = useState("");
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
            readApiResult<{ searches: RecentSearch[] }>(response, isHistoryPayload),
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

        // Signed-out visitors get 401 from /api/favourites; an empty list
        // (not the previous user's list) is the correct rendering of that.
        setSaved(favouritesData.ok ? favouritesData.searches : []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [placesState, refreshKey, userId]);

  const toggleSaved = useCallback(async (search: RecentSearch) => {
    const isSaved = search.savedAt !== null;

    setSavedError("");
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
      const data = await readApiResult<Record<string, never>>(response, () => true);
      if (!response.ok || !data.ok) throw new Error(data.ok ? "Could not update saved locations." : data.error);
    } catch (error) {
      setSavedError(error instanceof Error ? error.message : "Could not update saved locations.");
    } finally {
      setRefreshKey((key) => key + 1);
    }
  }, []);

  return { recent, saved, toggleSaved, savedError };
}
