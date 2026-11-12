"use client";

import Link from "next/link";
import type { RecentSearch } from "@/app/lib/types";
import { scoreBand, scoreBandClasses } from "@/app/lib/utils";
import { useLoginHref } from "@/app/hooks/useLoginHref";
import { StarIcon } from "./icons";

// Purely presentational: the lists live in useSavedSearches and arrive as
// props, so this component and the comparison panel can never disagree.
type RecentSearchesProps = {
  recent: RecentSearch[];
  saved: RecentSearch[];
  disabled: boolean;
  // Saving needs an account; when false the star buttons are not rendered.
  canSave: boolean;
  onSelect: (search: RecentSearch) => void;
  onToggleSaved: (search: RecentSearch) => void;
};

type SearchChipProps = {
  search: RecentSearch;
  disabled: boolean;
  canSave: boolean;
  onSelect: (search: RecentSearch) => void;
  onToggleSaved: (search: RecentSearch) => void;
};

// Every result is Australian, so the country adds nothing to a chip.
const shortAddress = (address: string) => address.replace(/, Australia$/, "");

// Buttons cannot be nested in HTML, so the chip is a div holding two
// separate buttons: the address (re-run the search) and the star (save).
function SearchChip({
  search,
  disabled,
  canSave,
  onSelect,
  onToggleSaved,
}: SearchChipProps) {
  const isSaved = search.savedAt !== null;
  const score =
    search.overallScore === null ? null : Math.round(search.overallScore);

  return (
    <div className="flex min-h-9 shrink-0 items-center rounded-full border border-line bg-surface text-xs font-medium text-ink-soft transition hover:border-accent-line">
      <button
        type="button"
        onClick={() => onSelect(search)}
        disabled={disabled}
        aria-label={`${search.formattedAddress}${
          score === null
            ? ", no current score, search again to refresh"
            : `, score ${score}`
        }`}
        className={`focus-ring flex min-h-9 items-center gap-2 rounded-l-full pl-3 hover:bg-accent-soft disabled:opacity-50 ${canSave ? "pr-1" : "rounded-r-full pr-3"}`}
      >
        <span className="max-w-60 truncate">
          {shortAddress(search.formattedAddress)}
        </span>
        <span
          className={`font-semibold tabular-nums ${
            score === null
              ? "text-ink-faint"
              : scoreBandClasses[scoreBand(score).band].text
          }`}
        >
          {score ?? "–"}
        </span>
      </button>
      {canSave && (
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
            className={`size-4 ${isSaved ? "text-amber-500" : "text-ink-faint"}`}
          />
        </button>
      )}
    </div>
  );
}

function ChipRow({
  title,
  searches,
  ...chipProps
}: { title: string; searches: RecentSearch[] } & Omit<
  SearchChipProps,
  "search"
>) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </h2>
      {/* One scrolling line on phones; wraps where there is room. */}
      <ul className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {searches.map((search) => (
          <li key={search.id} className="shrink-0">
            <SearchChip search={search} {...chipProps} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RecentSearches({
  recent,
  saved,
  disabled,
  canSave,
  onSelect,
  onToggleSaved,
}: RecentSearchesProps) {
  // Saved locations already appear in their own row; repeating them under
  // "Recent" would show the same chip twice, so recent keeps unsaved only.
  const unsavedRecent = recent.filter((search) => search.savedAt === null);
  const loginHref = useLoginHref();

  // Signed-out visitors see, in the exact spot their chips will occupy,
  // what an account buys them. Frontend-only: the APIs already gate.
  if (!canSave) {
    return (
      <p className="mt-4 flex items-start gap-2 rounded-lg bg-surface-subtle px-3 py-2.5 text-sm text-ink-muted">
        <StarIcon className="mt-0.5 size-4 text-ink-faint" />
        <span>
          <Link
            href={loginHref}
            className="font-medium text-accent hover:underline"
          >
            Sign in
          </Link>{" "}
          to save locations, keep your recent searches, and compare rentals side
          by side.
        </span>
      </p>
    );
  }

  if (unsavedRecent.length === 0 && saved.length === 0) {
    return null;
  }

  const chipProps = { disabled, canSave, onSelect, onToggleSaved };

  return (
    <div className="mt-4 space-y-3">
      {saved.length > 0 && (
        <ChipRow title="Saved locations" searches={saved} {...chipProps} />
      )}
      {unsavedRecent.length > 0 && (
        <ChipRow
          title="Recent searches"
          searches={unsavedRecent}
          {...chipProps}
        />
      )}
    </div>
  );
}
