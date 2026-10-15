"use client";
import Link from "next/link";
import { useExplore } from "./ExploreProvider";
import { Welcome } from "./Welcome";
import { LocationEvidenceNotes, LocationHeader } from "./LocationHeader";
import { LocationMap } from "./LocationMap";
import { SearchForm } from "./SearchForm";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { RecentSearches } from "./RecentSearches";
import { LocationAnalyst } from "./LocationAnalyst";
const noScroll = () => {};
export function ExploreWorkspace() {
  const search = useExplore();
  if (!search.result) return <Welcome />;
  const base = "/locations/" + search.locationId;
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
      <div className="mb-4">
        <SearchForm
          autocomplete={search.autocomplete}
          searchState={search.searchState}
          placesState={search.busy ? "loading" : search.placesState}
          error={search.error}
          onSearch={search.handleSearch}
          compact
        />
        {search.canSave ? (
          <details className="mt-2 text-xs text-ink-muted">
            <summary className="cursor-pointer">
              Saved and recent locations
            </summary>
            <RecentSearches
              recent={search.recent}
              saved={search.saved}
              disabled={search.busy}
              canSave={search.canSave}
              onSelect={search.searchFromHistory}
              onToggleSaved={search.toggleSaved}
            />
          </details>
        ) : null}
      </div>
      {search.busy ? (
        <p
          role="status"
          className="mb-3 rounded-lg bg-accent-soft p-3 text-sm text-accent-ink"
        >
          {search.stage} Previous evidence stays visible until the new result is
          ready.
        </p>
      ) : null}
      {search.searchState === "error" ? (
        <p className="mb-3 text-sm text-ink-muted">
          The previous result is still shown.
        </p>
      ) : null}
      <div className="grid items-stretch gap-5 lg:grid-cols-[1.35fr_0.85fr]">
        <section className="min-w-0 rounded-xl border border-line bg-surface p-5">
          <LocationHeader />
          <div inert={search.busy} className="mt-5 border-t border-line pt-5">
            <ScoreBreakdown
              categoryScores={search.categoryScores}
              locationId={search.locationId}
              scoringParams={search.scoringParams}
            />
          </div>
          <details className="mt-3 text-xs text-ink-muted">
            <summary className="cursor-pointer">How to use this result</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4 leading-5">
              <li>Choose a mobility profile and score priorities.</li>
              <li>Open a category to explore nearby places.</li>
              <li>Ask about your daily routines.</li>
              <li>Save two locations to compare them.</li>
            </ul>
          </details>
          <div className="mt-3">
            <LocationEvidenceNotes />
          </div>
          {!search.locationId ? (
            <p className="mt-3 text-sm text-ink-muted">
              This result could not be saved. Search again to enable detail
              pages and AI analysis.
            </p>
          ) : null}
          <LocationAnalyst
            key={search.locationId ?? "none"}
            locationId={search.locationId}
            profile={search.profile}
            preset={search.preset}
            placesState={search.busy ? "loading" : search.placesState}
            signedIn={search.canSave}
            sessionPending={search.sessionPending}
          />
        </section>
        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-base font-semibold text-ink">
              Location preview
            </h2>
            <LocationMap
              location={search.location}
              placeGroups={search.placeGroups}
              selectedPlace={null}
              onAutoScroll={noScroll}
            />
            <ul className="mt-3 list-disc space-y-0.5 pl-4 text-xs leading-5 text-ink-muted">
              <li>
                Matched as{" "}
                {search.location?.locationType
                  .toLowerCase()
                  .replaceAll("_", " ")}
                .
              </li>
              <li>Category colours connect places to their scores.</li>
            </ul>
          </section>
          {search.locationId ? (
            <nav
              aria-label="Supporting evidence"
              className="grid flex-1 content-start gap-2 rounded-xl border border-line bg-surface p-4"
            >
              <h2 className="mb-1 text-sm font-semibold text-ink">
                Explore more
              </h2>
              {[
                { anchor: "commute", label: "Melbourne CBD commute" },
                { anchor: "rent", label: "Community rent" },
                { anchor: "indicators", label: "Additional indicators" },
              ].map((item) => (
                <Link
                  key={item.anchor}
                  href={
                    base +
                    "/details?" +
                    search.scoringParams +
                    "#" +
                    item.anchor
                  }
                  className="rounded-md px-2 py-2 text-sm text-ink-soft hover:bg-hover"
                >
                  {item.label}{" "}
                  <span className="float-right text-accent-ink">→</span>
                </Link>
              ))}
            </nav>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
