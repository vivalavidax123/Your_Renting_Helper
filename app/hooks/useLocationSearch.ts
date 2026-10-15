import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  scoringQuery,
  type WeightPreset,
  type WeightProfile,
} from "@/app/lib/categories";
import { getErrorMessage, isJsonRecord, readApiResult } from "@/app/lib/api";
import { useAutocomplete } from "./useAutocomplete";
import { scorePlaceGroups } from "@/app/lib/scoring";
import type {
  GeocodeLocation,
  LocationResult,
  RecentSearch,
  RequestState,
} from "@/app/lib/types";

function isLocation(value: unknown) {
  return (
    isJsonRecord(value) &&
    typeof value.formattedAddress === "string" &&
    typeof value.query === "string" &&
    typeof value.placeId === "string" &&
    typeof value.latitude === "number" &&
    typeof value.longitude === "number" &&
    typeof value.locationType === "string" &&
    Array.isArray(value.types)
  );
}
function isResult(value: Record<string, unknown>) {
  return (
    Array.isArray(value.groups) &&
    typeof value.fetchedAt === "string" &&
    typeof value.cached === "boolean" &&
    (typeof value.locationId === "string" || value.locationId === null)
  );
}

export function useLocationSearch(
  profile: WeightProfile,
  preset: WeightPreset,
) {
  const router = useRouter();
  const pathname = usePathname();
  const [navigating, startTransition] = useTransition();
  const [result, setResult] = useState<LocationResult | null>(null);
  const [state, setState] = useState<RequestState>("idle");
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const autocomplete = useAutocomplete(state);
  const { selectQuery } = autocomplete;
  const controllerRef = useRef<AbortController | null>(null);
  const returningToWelcomeRef = useRef(false);
  const cache = useRef(new Map<string, LocationResult>());
  const cancelSearch = useCallback(() => {
    controllerRef.current?.abort();
  }, []);
  useEffect(() => cancelSearch, [cancelSearch]);

  const openLocation = useCallback(
    async (id: string) => {
      if (returningToWelcomeRef.current) {
        return;
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setState("loading");
      setStage("Opening saved location…");
      setError("");
      try {
        let next = cache.current.get(id);
        if (!next) {
          const response = await fetch(
            "/api/locations/" + encodeURIComponent(id),
            { signal: controller.signal },
          );
          const data = await readApiResult<LocationResult>(
            response,
            (value) => isResult(value) && isLocation(value.location),
          );
          if (!response.ok || !data.ok)
            throw new Error(
              data.ok ? "Could not open this location." : data.error,
            );
          next = data;
        }
        if (controller.signal.aborted) return;
        cache.current.set(id, next);
        selectQuery(next.location.formattedAddress);
        setResult(next);
        setState("success");
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(error, "Could not open this location."));
          setState("error");
        }
      }
    },
    [selectQuery],
  );

  async function runSearch(query: string, knownLocation?: GeocodeLocation) {
    returningToWelcomeRef.current = false;
    controllerRef.current?.abort();
    if (query.trim().length < 3) {
      setError("Enter at least 3 characters to search.");
      setState("error");
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    selectQuery(query.trim());
    setState("loading");
    setError("");
    setStage("Finding location…");
    try {
      let location = knownLocation;
      if (!location) {
        const response = await fetch(
          "/api/geocode?query=" + encodeURIComponent(query.trim()),
          { signal: controller.signal },
        );
        const data = await readApiResult<{ location: GeocodeLocation }>(
          response,
          (value) => isLocation(value.location),
        );
        if (!response.ok || !data.ok)
          throw new Error(
            data.ok ? "Could not find this location." : data.error,
          );
        location = data.location;
      }
      if (controller.signal.aborted) return;
      setStage("Finding nearby places and calculating scores…");
      const params = new URLSearchParams({
        lat: String(location.latitude),
        lng: String(location.longitude),
        query: location.query,
        address: location.formattedAddress,
        placeId: location.placeId,
        locationType: location.locationType,
        profile,
      });
      const response = await fetch("/api/places?" + params, {
        signal: controller.signal,
      });
      const data = await readApiResult<Omit<LocationResult, "location">>(
        response,
        isResult,
      );
      if (!response.ok || !data.ok)
        throw new Error(data.ok ? "Could not load nearby places." : data.error);
      if (controller.signal.aborted) return;
      const next = { ...data, location };
      if (next.locationId) cache.current.set(next.locationId, next);
      selectQuery(location.formattedAddress);
      startTransition(() => {
        setResult(next);
        setState("success");
        router.push(
          next.locationId
            ? "/locations/" +
                encodeURIComponent(next.locationId) +
                "?" +
                scoringQuery(profile, preset)
            : "/?" + scoringQuery(profile, preset),
        );
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        setError(getErrorMessage(error, "Search failed. Please try again."));
        setState("error");
      }
    }
  }

  function returnToWelcome() {
    // While leaving a location page, its loader would reopen the location we
    // just cleared, so openLocation is paused until the URL reaches "/". On
    // "/" itself the URL never changes, so pausing there would never end and
    // a later Back to a location page would stay on "Opening…" forever.
    returningToWelcomeRef.current = pathname !== "/";
    controllerRef.current?.abort();
    controllerRef.current = null;
    autocomplete.selectQuery("");
    setResult(null);
    setState("idle");
    setStage("");
    setError("");
  }

  const finishWelcomeNavigation = useCallback(() => {
    returningToWelcomeRef.current = false;
  }, []);

  const scored = scorePlaceGroups(result?.groups ?? [], profile, preset);
  return {
    autocomplete,
    result,
    searchState: state,
    busy: state === "loading" || navigating,
    stage,
    location: result?.location ?? null,
    error,
    placesState: (result ? "success" : state) as RequestState,
    placeGroups: result?.groups ?? [],
    categoryScores: scored.scores,
    overallScore: result ? scored.overallScore : null,
    locationId: result?.locationId ?? null,
    fetchedAt: result?.fetchedAt ?? null,
    placesError: error,
    resultFromCache: result?.cached ?? false,
    handleSearch: (query = autocomplete.query) => runSearch(query),
    searchFromHistory: (search: RecentSearch) =>
      runSearch(search.query, { ...search, types: [] }),
    openLocation,
    cancelSearch,
    returnToWelcome,
    finishWelcomeNavigation,
  };
}
