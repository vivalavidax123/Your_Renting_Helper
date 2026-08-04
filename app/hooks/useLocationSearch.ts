import { useState, useEffect, useRef } from "react";
import type { WeightProfile } from "../lib/categories";
import { isJsonRecord, readApiResult } from "../lib/api";
import { useAutocomplete } from "./useAutocomplete";
import type {
  GeocodeLocation,
  RequestState,
  PlaceGroup,
  CategoryScore,
  RecentSearch,
} from "../lib/types";

function isGeocodePayload(value: Record<string, unknown>) {
  const location = value.location;

  return (
    isJsonRecord(location) &&
    typeof location.query === "string" &&
    typeof location.formattedAddress === "string" &&
    typeof location.placeId === "string" &&
    typeof location.latitude === "number" &&
    typeof location.longitude === "number" &&
    typeof location.locationType === "string" &&
    Array.isArray(location.types)
  );
}

function isPlacesPayload(value: Record<string, unknown>) {
  return (
    Array.isArray(value.groups) &&
    Array.isArray(value.scores) &&
    typeof value.overallScore === "number" &&
    typeof value.cached === "boolean" &&
    typeof value.fetchedAt === "string"
  );
}

type SearchResultState = {
  status: RequestState;
  location: GeocodeLocation | null;
  error: string;
};

type PlacesResultState = {
  status: RequestState;
  groups: PlaceGroup[];
  scores: CategoryScore[];
  overallScore: number | null;
  error: string;
  fromCache: boolean;
};

const initialSearchResult: SearchResultState = {
  status: "idle",
  location: null,
  error: "",
};

const emptyPlacesResult: PlacesResultState = {
  status: "idle",
  groups: [],
  scores: [],
  overallScore: null,
  error: "",
  fromCache: false,
};

export function useLocationSearch() {
  const [searchResult, setSearchResult] = useState(initialSearchResult);
  const [placesResult, setPlacesResult] = useState(emptyPlacesResult);
  const autocomplete = useAutocomplete(searchResult.status);
  const [profile, setProfile] = useState<WeightProfile>("carFree");
  
  const geocodeRequestId = useRef(0);
  const placesRequestId = useRef(0);
  const geocodeController = useRef<AbortController | null>(null);
  const placesController = useRef<AbortController | null>(null);

  function cancelGeocodeRequest() {
    geocodeRequestId.current += 1;
    geocodeController.current?.abort();
    geocodeController.current = null;
  }

  function cancelPlacesRequest() {
    placesRequestId.current += 1;
    placesController.current?.abort();
    placesController.current = null;
  }

  // Requests may still be active when navigating away. Invalidate their IDs
  // as well as aborting them so a response already queued by the browser can
  // never update state after this hook unmounts.
  useEffect(() => {
    return () => {
      geocodeRequestId.current += 1;
      placesRequestId.current += 1;
      geocodeController.current?.abort();
      placesController.current?.abort();
    };
  }, []);

  async function loadNearbyPlaces(
    nextLocation: GeocodeLocation,
    profileOverride?: WeightProfile,
  ) {
    cancelPlacesRequest();

    const requestId = placesRequestId.current;
    const controller = new AbortController();
    placesController.current = controller;

    // State updates are asynchronous, so a caller that just changed the
    // profile passes the new value directly instead of reading stale state.
    const activeProfile = profileOverride ?? profile;

    setPlacesResult({ ...emptyPlacesResult, status: "loading" });

    try {
      const placesUrl = new URLSearchParams({
        lat: String(nextLocation.latitude),
        lng: String(nextLocation.longitude),
        query: nextLocation.query,
        address: nextLocation.formattedAddress,
        placeId: nextLocation.placeId,
        locationType: nextLocation.locationType,
        profile: activeProfile,
      });
      const response = await fetch(`/api/places?${placesUrl.toString()}`, {
        signal: controller.signal,
      });
      const data = await readApiResult<{
        groups: PlaceGroup[];
        scores: CategoryScore[];
        overallScore: number;
        cached: boolean;
        fetchedAt: string;
      }>(response, isPlacesPayload);

      if (
        controller.signal.aborted ||
        requestId !== placesRequestId.current
      ) {
        return;
      }

      if (!response.ok || !data.ok) {
        setPlacesResult({
          ...emptyPlacesResult,
          status: "error",
          error: data.ok ? "Could not load nearby places." : data.error,
        });
        return;
      }

      setPlacesResult({
        status: "success",
        groups: data.groups,
        scores: data.scores,
        overallScore: data.overallScore,
        error: "",
        fromCache: data.cached,
      });
    } catch {
      if (
        controller.signal.aborted ||
        requestId !== placesRequestId.current
      ) {
        return;
      }

      setPlacesResult({
        ...emptyPlacesResult,
        status: "error",
        error: "Nearby places failed to load. Try searching again.",
      });
    } finally {
      if (requestId === placesRequestId.current) {
        placesController.current = null;
      }
    }
  }

  async function handleSearch() {
    autocomplete.closeSuggestions();
    // A submitted search supersedes both an earlier geocode and any place
    // result still loading for the previous location.
    cancelGeocodeRequest();
    cancelPlacesRequest();

    const trimmedQuery = autocomplete.query.trim();

    if (trimmedQuery.length < 3) {
      setSearchResult((current) => ({
        ...current,
        status: "error",
        error: "Enter at least 3 characters to search.",
      }));
      return;
    }

    const requestId = geocodeRequestId.current;
    const controller = new AbortController();
    geocodeController.current = controller;

    setSearchResult((current) => ({
      ...current,
      status: "loading",
      error: "",
    }));
    setPlacesResult(emptyPlacesResult);

    try {
      const response = await fetch(
        `/api/geocode?query=${encodeURIComponent(trimmedQuery)}`,
        { signal: controller.signal },
      );
      const data = await readApiResult<{ location: GeocodeLocation }>(
        response,
        isGeocodePayload,
      );

      if (
        controller.signal.aborted ||
        requestId !== geocodeRequestId.current
      ) {
        return;
      }

      if (!response.ok || !data.ok) {
        setSearchResult((current) => ({
          ...current,
          status: "error",
          error: data.ok ? "Could not geocode this location." : data.error,
        }));
        return;
      }

      setSearchResult({ status: "success", location: data.location, error: "" });
      await loadNearbyPlaces(data.location);
    } catch {
      if (
        controller.signal.aborted ||
        requestId !== geocodeRequestId.current
      ) {
        return;
      }

      setSearchResult((current) => ({
        ...current,
        status: "error",
        error: "Search failed. Check your connection and try again.",
      }));
    } finally {
      if (requestId === geocodeRequestId.current) {
        geocodeController.current = null;
      }
    }
  }

  function changeProfile(nextProfile: WeightProfile) {
    setProfile(nextProfile);

    // Rescore the current result immediately; the request is a guaranteed
    // cache hit, so switching profiles never costs a Google lookup.
    if (searchResult.location && placesResult.status === "success") {
      void loadNearbyPlaces(searchResult.location, nextProfile);
    }
  }

  function searchFromHistory(search: RecentSearch) {
    // A history selection supersedes a typed search that may still be
    // geocoding. loadNearbyPlaces cancels any older places request itself.
    cancelGeocodeRequest();

    const nextLocation: GeocodeLocation = {
      query: search.query,
      formattedAddress: search.formattedAddress,
      placeId: search.placeId,
      latitude: search.latitude,
      longitude: search.longitude,
      locationType: search.locationType,
      types: [],
    };

    // The saved coordinates make geocoding unnecessary; setting the query as
    // the selected suggestion also keeps autocomplete from reopening.
    autocomplete.selectQuery(search.query);
    setSearchResult({ status: "success", location: nextLocation, error: "" });
    void loadNearbyPlaces(nextLocation);
  }

  return {
    autocomplete,
    searchState: searchResult.status,
    location: searchResult.location,
    error: searchResult.error,
    placesState: placesResult.status,
    placeGroups: placesResult.groups,
    categoryScores: placesResult.scores,
    overallScore: placesResult.overallScore,
    placesError: placesResult.error,
    resultFromCache: placesResult.fromCache,
    profile,
    changeProfile,
    handleSearch,
    searchFromHistory,
  };
}
