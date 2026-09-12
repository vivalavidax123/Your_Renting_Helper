"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useExplore } from "./ExploreProvider";
export function LocationLoader({
  locationId,
  children,
}: {
  locationId: string;
  children: React.ReactNode;
}) {
  const {
    locationId: activeId,
    openLocation,
    cancelSearch,
    searchState,
    error,
  } = useExplore();
  useEffect(() => {
    if (activeId !== locationId) {
      void openLocation(locationId);
    }

    return cancelSearch;
  }, [activeId, locationId, openLocation, cancelSearch]);
  if (activeId !== locationId)
    return (
      <main className="mx-auto max-w-7xl p-6">
        {searchState === "error" ? (
          <>
            <p role="alert">{error}</p>
            <button
              className="mt-4 underline"
              onClick={() => void openLocation(locationId)}
            >
              Retry
            </button>
            <Link className="ml-4 underline" href="/">
              Search again
            </Link>
          </>
        ) : (
          <p role="status">Opening location evidence…</p>
        )}
      </main>
    );
  return children;
}
