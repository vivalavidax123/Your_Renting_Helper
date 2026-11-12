"use client";
import { useEffect } from "react";
import { useExplore } from "./ExploreProvider";

// Opens the stored location named in the URL. The workspace renders at once:
// it shows loading skeletons while the evidence is fetched, and the search
// card shows the message if the location cannot be opened.
export function LocationLoader({
  locationId,
  children,
}: {
  locationId: string;
  children: React.ReactNode;
}) {
  const { locationId: activeId, openLocation, cancelSearch } = useExplore();
  useEffect(() => {
    if (activeId !== locationId) {
      void openLocation(locationId);
    }

    return cancelSearch;
  }, [activeId, locationId, openLocation, cancelSearch]);
  return children;
}
