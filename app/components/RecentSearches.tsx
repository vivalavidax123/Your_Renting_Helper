"use client";

import type { RecentSearch } from "@/app/lib/types";
import { scoreBand, scoreBandClasses } from "@/app/lib/utils";
import { StarIcon } from "./icons";

// Every result is Australian, so the country adds nothing to a chip.
const shortAddress = (address: string) => address.replace(/, Australia$/, "");

// Purely presentational: the lists live in useSavedSearches and arrive as
// props, so this component and the comparison panel can never disagree.
// Callers render it only for signed-in visitors, because saving and history
// both need an account.
type RecentSearchesProps = {
  recent: RecentSearch[];
  saved: RecentSearch[];
  disabled: boolean;
  onSelect: (search: RecentSearch) => void;
  onToggleSaved: (search: RecentSearch) => void;
};

type SearchChipProps = {
  search: RecentSearch;
  disabled: boolean;
  onSelect: (search: RecentSearch) => void;
  onToggleSaved: (search: RecentSearch) => void;
};

// Buttons cannot be nested in HTML, so the chip is a div holding two
// separate buttons: the address (re-run the search) and the star (save).
function SearchChip({
  search,
  disabled,
  onSelect,
  onToggleSaved,
}: SearchChipProps) {
  const isSaved = search.savedAt !== null;
  const score =
    search.overallScore === null ? null : Math.round(search.overallScore);

  return (
    <div className="flex min-h-9 items-center rounded-full border border-line bg-surface text-xs font-medium text-ink-soft transition hover:border-accent-line">
      <button
        type="button"
        onClick={() => onSelect(search)}
        disabled={disabled}
        title={search.formattedAddress}
        className="focus-ring flex min-h-9 items-center gap-2 rounded-l-full pl-3 pr-1 hover:bg-accent-soft disabled:opacity-50"
      >
        <span className="max-w-60 truncate">
          {shortAddress(search.formattedAddress)}
        </span>
        {score !== null ? (
          <span
            className={
              "font-semibold tabular-nums " +
              scoreBandClasses[scoreBand(score).band].text
            }
          >
            {score}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => onToggleSaved(search)}
        disabled={disabled}
        aria-label={
          isSaved ? "Remove from saved locations" : "Save this location"
        }
        aria-pressed={isSaved}
        className="focus-ring flex size-9 items-center justify-center rounded-r-full hover:bg-warning-soft disabled:opacity-50"
      >
        <StarIcon
          filled={isSaved}
          className={
            "size-4 " + (isSaved ? "text-amber-500" : "text-ink-faint")
          }
        />
      </button>
    </div>
  );
}

export function RecentSearches({
  recent,
  saved,
  disabled,
  onSelect,
  onToggleSaved,
}: RecentSearchesProps) {
  // Saved locations already appear in their own row; repeating them under
  // "Recent" would show the same chip twice, so recent keeps unsaved only.
  const unsavedRecent = recent.filter((search) => search.savedAt === null);

  if (unsavedRecent.length === 0 && saved.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      {saved.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Saved locations
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {saved.map((search) => (
              <li key={search.id}>
                <SearchChip
                  search={search}
                  disabled={disabled}
                  onSelect={onSelect}
                  onToggleSaved={onToggleSaved}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {unsavedRecent.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Recent searches
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {unsavedRecent.map((search) => (
              <li key={search.id}>
                <SearchChip
                  search={search}
                  disabled={disabled}
                  onSelect={onSelect}
                  onToggleSaved={onToggleSaved}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
