"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useExplore } from "./ExploreProvider";
export function LocationBoundary({ propertyId, children }: { propertyId: string; children: React.ReactNode }) {
  const { propertyId: activeId, openLocation, cancelSearch, searchState, error } = useExplore();
  useEffect(() => { void openLocation(propertyId); return cancelSearch; }, [propertyId, openLocation, cancelSearch]);
  if (activeId !== propertyId) return <main className="mx-auto max-w-7xl p-6">
    {searchState === "error" ? <><p role="alert">{error}</p><button className="mt-4 underline" onClick={() => void openLocation(propertyId)}>Retry</button><Link className="ml-4 underline" href="/">Search again</Link></> : <p role="status">Opening location evidence…</p>}
  </main>;
  return children;
}
