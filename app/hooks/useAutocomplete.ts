import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { readApiResult } from "../lib/api";
import type { AddressSuggestion, RequestState } from "../lib/types";

function isAutocompletePayload(value: Record<string, unknown>) {
  return Array.isArray(value.suggestions);
}

export function useAutocomplete(searchState: RequestState) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [selectedSuggestionText, setSelectedSuggestionText] = useState("");
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (
      trimmedQuery.length < 3 ||
      trimmedQuery === selectedSuggestionText ||
      searchState === "loading"
    ) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/autocomplete?query=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal },
        );
        const data = await readApiResult<{
          suggestions: AddressSuggestion[];
        }>(response, isAutocompletePayload);

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (!response.ok || !data.ok) {
          setSuggestions([]);
          setShowSuggestions(false);
          setActiveSuggestionIndex(-1);
          return;
        }

        setSuggestions(data.suggestions);
        setShowSuggestions(data.suggestions.length > 0);
        setActiveSuggestionIndex(data.suggestions.length > 0 ? 0 : -1);
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setSuggestions([]);
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, searchState, selectedSuggestionText]);

  function changeQuery(nextQuery: string) {
    setQuery(nextQuery);
    setSelectedSuggestionText("");

    if (nextQuery.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  }

  function selectQuery(nextQuery: string) {
    setQuery(nextQuery);
    setSelectedSuggestionText(nextQuery);
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  }

  function selectSuggestion(suggestion: AddressSuggestion) {
    selectQuery(suggestion.text);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex(
        (index) => (index - 1 + suggestions.length) % suggestions.length,
      );
      return;
    }

    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestionIndex]);
      return;
    }

    if (event.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  }

  return {
    query,
    suggestions,
    showSuggestions,
    activeSuggestionIndex,
    changeQuery,
    selectQuery,
    selectSuggestion,
    handleKeyDown,
    openSuggestions: () => setShowSuggestions(suggestions.length > 0),
    closeSuggestions: () => setShowSuggestions(false),
    activateSuggestion: setActiveSuggestionIndex,
  };
}

export type AutocompleteController = ReturnType<typeof useAutocomplete>;
