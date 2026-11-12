"use client";
import Link from "next/link";
import { useExplore } from "./ExploreProvider";
import { SearchForm } from "./SearchForm";
import { RecentSearches } from "./RecentSearches";
import { useLoginHref } from "@/app/hooks/useLoginHref";
import { rentScoreCategories } from "@/app/lib/categories";

const exampleSuburbs = [
  "South Yarra VIC",
  "Footscray VIC",
  "Box Hill VIC",
  "Brunswick VIC",
];

// Static numbers for the "Example result" preview. They are not a real
// address, so the card is labelled as an example and names no suburb.
// Labels and colours come from the real category config.
const exampleScores = (
  [
    ["transport", 88],
    ["groceries", 83],
    ["food", 80],
    ["health", 74],
  ] as const
).map(([id, score]) => {
  const category = rentScoreCategories.find((item) => item.id === id)!;
  return { label: category.label, colorClass: category.colorClass, score };
});

function ExampleResult() {
  return (
    <aside
      aria-label="Example result"
      className="hidden rounded-xl border border-line bg-surface p-6 lg:block"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
        Example result
      </p>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-sm text-ink-soft">
          Every search gives you an overall score, tuned to how you live.
        </p>
        <div className="flex shrink-0 flex-col items-center rounded-lg border border-accent bg-accent-soft px-4 py-2 text-accent-ink">
          <p className="leading-none">
            <span className="text-3xl font-bold">82</span>
            <span className="ml-1 text-xs font-semibold">/100</span>
          </p>
          <p className="mt-1 text-xs font-medium">Overall score</p>
        </div>
      </div>
      <ul className="mt-5 space-y-3">
        {exampleScores.map((item) => (
          <li key={item.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink-soft">{item.label}</span>
              <span className="font-semibold text-ink">{item.score}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
              <div
                className={"h-full rounded-full " + item.colorClass}
                style={{ width: item.score + "%" }}
              />
            </div>
          </li>
        ))}
      </ul>
      <ul className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm text-ink-soft">
        <li>
          <span className="font-semibold text-ink">4 min</span> walk to the
          nearest supermarket
        </li>
        <li>
          <span className="font-semibold text-ink">25 min</span> to Melbourne
          CBD by public transport
        </li>
        <li>
          Re-weight the score for{" "}
          <span className="font-semibold text-ink">
            students, families or commuters
          </span>
        </li>
      </ul>
    </aside>
  );
}

export function Welcome() {
  const search = useExplore();
  const loginHref = useLoginHref();
  return (
    <main className="mx-auto grid w-full max-w-7xl items-start gap-6 px-4 pb-8 pt-3 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pt-8">
      <section className="rounded-xl border border-line bg-surface p-5 sm:p-8">
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
              disabled={search.busy}
              onClick={() => void search.handleSearch(query)}
              className="rounded-full border border-line px-3 py-2 text-ink-soft transition hover:border-accent hover:bg-accent-soft disabled:opacity-50"
            >
              {query}
            </button>
          ))}
        </div>
        {search.canSave ? (
          <RecentSearches
            recent={search.recent}
            saved={search.saved}
            disabled={search.busy}
            onSelect={search.searchFromHistory}
            onToggleSaved={search.toggleSaved}
          />
        ) : !search.sessionPending ? (
          // Signed-out visitors learn what an account adds, in the spot where
          // their saved chips would appear. Hidden while the session loads so
          // signed-in visitors never see it flash.
          <p className="mt-4 text-sm text-ink-muted">
            <Link
              href={loginHref}
              className="font-medium text-accent hover:underline"
            >
              Sign in
            </Link>{" "}
            to save addresses and come back to them later.
          </p>
        ) : null}
        {search.busy ? (
          <p role="status" className="mt-4 text-sm font-medium text-accent-ink">
            {search.stage}
          </p>
        ) : null}
      </section>
      <ExampleResult />
    </main>
  );
}
