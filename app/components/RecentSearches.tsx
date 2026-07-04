"use client";

import { useEffect, useState } from "react";
import type {
  HistoryFailure,
  HistorySuccess,
  PlacesState,
  RecentSearch,
} from "../lib/types";

type RecentSearchesProps = {
  placesState: PlacesState;
  onSelect: (search: RecentSearch) => void;
};

export function RecentSearches({ placesState, onSelect }: RecentSearchesProps) {
  const [searches, setSearches] = useState<RecentSearch[]>([]);

  // Refetch on mount and after each completed search so the list stays
  // current without polling.
  useEffect(() => {
    if (placesState === "loading") {
      return;
    }

    let cancelled = false;

    fetch("/api/history")
      .then(
        (response) => response.json() as Promise<HistorySuccess | HistoryFailure>,
      )
      .then((data) => {
        if (!cancelled && data.ok) {
          setSearches(data.searches);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [placesState]);

  if (searches.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Recent searches
      </h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {searches.map((search) => (
          <li key={search.id}>
            <button
              type="button"
              onClick={() => onSelect(search)}
              disabled={placesState === "loading"}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"
            >
              <span className="max-w-52 truncate">{search.formattedAddress}</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">
                {Math.round(search.overallScore)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
