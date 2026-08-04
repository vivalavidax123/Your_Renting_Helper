import type { FormEvent } from "react";
import type { AutocompleteController } from "../hooks/useAutocomplete";
import type { RequestState } from "../lib/types";

type SearchFormProps = {
  autocomplete: AutocompleteController;
  searchState: RequestState;
  placesState: RequestState;
  error: string;
  onSearch: () => void;
};

export function SearchForm({
  autocomplete,
  searchState,
  placesState,
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <form
      className="rounded-lg border border-line bg-surface-subtle p-3 shadow-inner"
      onSubmit={handleSubmit}
    >
      <label
        htmlFor="location"
        className="mb-2 block text-sm font-semibold text-ink"
      >
        Address or suburb
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            id="location"
            type="text"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            onFocus={openSuggestions}
            onBlur={() => {
              window.setTimeout(closeSuggestions, 120);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Try: Parramatta NSW"
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls="location-suggestions"
            className="min-h-12 w-full rounded-md border border-line-strong bg-control px-4 text-base text-ink outline-none transition placeholder:text-ink-faint focus:border-accent focus:ring-4 focus:ring-accent-ring"
          />
          {showSuggestions ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-20 overflow-hidden rounded-md border border-line bg-surface shadow-lg">
              <ul id="location-suggestions" role="listbox" className="py-1">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.placeId}
                    role="option"
                    aria-selected={index === activeSuggestionIndex}
                  >
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectSuggestion(suggestion);
                      }}
                      onMouseEnter={() => activateSuggestion(index)}
                      className={`w-full px-4 py-2.5 text-left transition ${
                        index === activeSuggestionIndex
                          ? "bg-accent-soft"
                          : "bg-surface hover:bg-hover"
                      }`}
                    >
                      <span className="block truncate text-sm font-semibold text-ink">
                        {suggestion.mainText}
                      </span>
                      {suggestion.secondaryText ? (
                        <span className="mt-0.5 block truncate text-xs text-ink-muted">
                          {suggestion.secondaryText}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line-soft px-4 py-1.5 text-right text-[11px] font-medium text-ink-faint">
                Powered by Google
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={searchState === "loading" || placesState === "loading"}
          className="min-h-12 rounded-md bg-action px-6 text-base font-medium text-action-ink transition hover:bg-action-hover focus:outline-none focus:ring-4 focus:ring-accent-ring disabled:cursor-not-allowed disabled:bg-action-disabled"
        >
          {searchState === "loading" ? "Searching..." : "Search"}
        </button>
      </div>
      {searchState === "error" ? (
        <p className="mt-3 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink">
          {error}
        </p>
      ) : null}
    </form>
  );
}
