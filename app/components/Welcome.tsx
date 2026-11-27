"use client";

import { rentScoreCategories, weightPresets } from "@/app/lib/categories";
import type { CategoryScore } from "@/app/lib/types";
import { scoreBand, scoreBandClasses } from "@/app/lib/utils";
import { useExplore } from "./ExploreProvider";
import { CheckIcon, TrainIcon, WalkIcon } from "./icons";
import { RecentSearches } from "./RecentSearches";
import {
  CategoryCardFace,
  categoryCardClass,
  categoryCardColor,
} from "./ScoreBreakdown";
import { ScoreRing } from "./ScoreRing";
import { SearchForm } from "./SearchForm";

// Four different kinds of Melbourne area; commute times only cover Melbourne.
const exampleSuburbs = [
  "South Yarra VIC",
  "Footscray VIC",
  "Box Hill VIC",
  "Brunswick VIC",
];

// Static numbers for the "Example result" preview. They are not a real
// address, so the card is labelled as an example and names no suburb.
// Labels come from the real category config and weights from the Balanced
// preset, so the cards read exactly like a real result.
const exampleOverall = 82;
const exampleScores: CategoryScore[] = (
  [
    ["transport", 88, 6, 380],
    ["groceries", 83, 4, 260],
    ["health", 74, 3, 440],
    ["food", 80, 5, 320],
  ] as const
).map(([id, score, count, closestDistanceMeters]) => {
  const category = rentScoreCategories.find((item) => item.id === id);

  return {
    id,
    label: category?.label ?? id,
    score,
    weight: weightPresets.balanced[id],
    detail: "",
    count,
    closestDistanceMeters,
    radiusMeters: category?.radiusMeters ?? 0,
    explanation: "",
  };
});

const exampleFacts = [
  { Icon: WalkIcon, strong: "4 min", text: "walk to the nearest supermarket" },
  {
    Icon: TrainIcon,
    strong: "25 min",
    text: "to Melbourne CBD by public transport",
  },
  {
    Icon: CheckIcon,
    strong: "Re-weight",
    text: "for students, families or commuters",
  },
];

// Uses the result page's own pieces (ScoreRing, the category card face) so
// the preview matches what a search actually shows.
function ExampleResult() {
  const band = scoreBand(exampleOverall);

  return (
    <aside
      aria-label="Example result"
      className="hidden rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6 lg:block"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
        Example result
      </p>
      <div className="mt-4 flex items-center gap-4">
        <ScoreRing score={exampleOverall} className="size-20" />
        <div className="min-w-0">
          <p className={`font-semibold ${scoreBandClasses[band.band].text}`}>
            {band.label}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">
            Every search gives you an overall score, tuned to how you live.
          </p>
        </div>
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-2">
        {exampleScores.map((category) => (
          <li key={category.id}>
            <div
              className={categoryCardClass}
              style={{ borderTopColor: categoryCardColor(category) }}
            >
              <CategoryCardFace category={category} />
            </div>
          </li>
        ))}
      </ul>
      <ul className="mt-5 space-y-2 border-t border-line pt-4 text-sm text-ink-soft">
        {exampleFacts.map(({ Icon, strong, text }) => (
          <li key={strong} className="flex items-center gap-2.5">
            <Icon className="size-4 shrink-0 text-accent" />
            <span>
              <span className="font-semibold text-ink">{strong}</span> {text}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

// The home page before any search: one search card and an example result,
// with no map and no provider request. The first search swaps this for the
// full workspace (ExploreWorkspace decides which one to render).
export function Welcome({
  onToggleSaved,
}: {
  onToggleSaved: Parameters<typeof RecentSearches>[0]["onToggleSaved"];
}) {
  const search = useExplore();

  return (
    // Same outer padding and max width as the site header, so the logo and
    // the cards line up.
    <main className="flex-1 px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-10">
      <div className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-8">
          <h1 className="max-w-lg text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
            Find a location that fits your everyday life.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-ink-muted">
            See the shops, transport and services around any address, scored for
            the way you live. Best for Melbourne. No account needed.
          </p>
          <div className="mt-6">
            <SearchForm
              autocomplete={search.autocomplete}
              searchState={search.searchState}
              busy={search.busy}
              error={search.error}
              onSearch={search.handleSearch}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span>Try a suburb:</span>
            {exampleSuburbs.map((query) => (
              <button
                key={query}
                type="button"
                disabled={search.busy}
                onClick={() => void search.handleSearch(query)}
                className="focus-ring min-h-9 rounded-full border border-line bg-surface px-3 text-ink-soft transition hover:border-accent-line hover:bg-accent-soft disabled:opacity-50"
              >
                {query}
              </button>
            ))}
          </div>
          {/* Hidden while the session loads so signed-in visitors never see
              the sign-in strip flash before their chips arrive. Signed out,
              RecentSearches shows the same strip as the result page. */}
          {search.canSave || !search.sessionPending ? (
            <RecentSearches
              recent={search.recent}
              saved={search.saved}
              disabled={search.busy}
              canSave={search.canSave}
              onSelect={search.searchFromHistory}
              onToggleSaved={onToggleSaved}
              onRemove={(entry) => void search.removeRecent(entry)}
            />
          ) : null}
          {search.savedError ? (
            <p role="alert" className="mt-3 text-sm text-danger-ink">
              {search.savedError}
            </p>
          ) : null}
        </section>
        <ExampleResult />
      </div>
    </main>
  );
}
