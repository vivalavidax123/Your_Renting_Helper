"use client";

import { useEffect, useRef, type FormEvent } from "react";
import type { AutocompleteController } from "@/app/hooks/useAutocomplete";
import type { RequestState } from "@/app/lib/types";
import { CloseIcon, MapPinIcon, SearchIcon, SpinnerIcon } from "./icons";

type SearchFormProps = {
  autocomplete: AutocompleteController;
  searchState: RequestState;
  busy: boolean;
  error: string;
  onSearch: () => void;
};

// Bolds the part of a suggestion the visitor has already typed.
function SuggestionTitle({ text, query }: { text: string; query: string }) {
  const typed = query.trim();
  const matches =
    typed.length > 0 && text.toLowerCase().startsWith(typed.toLowerCase());

  return matches ? (
    <>
      <span className="font-bold">{text.slice(0, typed.length)}</span>
      {text.slice(typed.length)}
    </>
  ) : (
    text
  );
}

export function SearchForm({
  autocomplete,
  searchState,
  busy,
  error,
  onSearch,
}: SearchFormProps) {
  const {
    query,
    suggestions,
    showSuggestions,
    activeSuggestionIndex,
    changeQuery,
    selectSuggestion,
    handleKeyDown,
    openSuggestions,
    closeSuggestions,
    activateSuggestion,
  } = autocomplete;
  const inputRef = useRef<HTMLInputElement | null>(null);

  // "/" jumps to the search box unless the visitor is already typing.
  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName ?? "");

      if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleShortcut);

    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <form role="search" onSubmit={handleSubmit}>
      <label
        htmlFor="location"
        className="mb-2 block text-sm font-semibold text-ink"
      >
        Address or suburb
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-faint" />
          <input
            ref={inputRef}
            id="location"
            type="text"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            onFocus={openSuggestions}
            onBlur={() => {
              window.setTimeout(closeSuggestions, 120);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Try: South Yarra VIC"
            autoComplete="off"
            // A combobox with aria-activedescendant lets screen readers
            // announce the highlighted suggestion while focus stays here.
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls="location-suggestions"
            aria-activedescendant={
              showSuggestions && activeSuggestionIndex >= 0
                ? `location-suggestion-${activeSuggestionIndex}`
                : undefined
            }
            className={`min-h-12 w-full rounded-lg border border-line-strong bg-control pl-11 pr-11 text-base text-ink outline-none transition placeholder:text-ink-faint focus:border-accent focus:ring-4 focus:ring-accent-ring`}
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                changeQuery("");
                inputRef.current?.focus();
              }}
              className="focus-ring absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-hover hover:text-ink"
            >
              <CloseIcon />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 text-xs text-ink-faint lg:block">
              /
            </kbd>
          )}
          {showSuggestions ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-30 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
              <ul id="location-suggestions" role="listbox" className="py-1">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.placeId}
                    id={`location-suggestion-${index}`}
                    role="option"
                    aria-selected={index === activeSuggestionIndex}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectSuggestion(suggestion);
                    }}
                    onMouseEnter={() => activateSuggestion(index)}
                    className={`flex cursor-pointer items-start gap-2.5 px-4 py-2.5 transition ${
                      index === activeSuggestionIndex
                        ? "bg-accent-soft"
                        : "hover:bg-hover"
                    }`}
                  >
                    <MapPinIcon className="mt-0.5 size-4 shrink-0 text-ink-faint" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">
                        <SuggestionTitle
                          text={suggestion.mainText}
                          query={query}
                        />
                      </span>
                      {suggestion.secondaryText ? (
                        <span className="mt-0.5 block truncate text-xs text-ink-muted">
                          {suggestion.secondaryText}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line-soft px-4 py-1.5 text-right text-xs font-medium text-ink-muted">
                Powered by Google
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={busy}
          aria-label={busy ? "Searching" : "Search"}
          className={`flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-lg bg-action px-3 font-medium text-action-ink transition hover:bg-action-hover focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-ring disabled:cursor-not-allowed disabled:bg-action-disabled text-base sm:px-6`}
        >
          {busy ? (
            <SpinnerIcon className="size-5" />
          ) : (
            <SearchIcon className="size-5 sm:hidden" />
          )}
          <span className="max-sm:hidden">
            {searchState === "loading" ? "Searching…" : "Search"}
          </span>
        </button>
      </div>
      {searchState === "error" ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
