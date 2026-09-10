"use client";
import { useExplore } from "./ExploreProvider";
import { SearchForm } from "./SearchForm";
import { RecentSearches } from "./RecentSearches";

export function Welcome() {
  const search = useExplore();
  return <main className="mx-auto grid w-full max-w-7xl items-start gap-6 px-4 pb-8 pt-3 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pt-8">
    <section className="rounded-xl border border-line bg-surface p-5 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-ink">A little context before you rent</p>
      <h1 className="mt-3 max-w-lg text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">Find a location that fits your everyday life.</h1>
      <p className="mt-3 text-sm leading-6 text-ink-muted">Explore the shops, transport and services around an Australian address. No account needed to search.</p>
      <ol className="my-6 space-y-3 text-sm text-ink-soft">
        <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink">1</span><span><strong className="text-ink">Search an address or suburb.</strong> See what is nearby.</span></li>
        <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink">2</span><span><strong className="text-ink">Choose No car or Car owner.</strong> Explore the category scores.</span></li>
        <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink">3</span><span><strong className="text-ink">Ask a question.</strong> Sign in to save and compare locations.</span></li>
      </ol>
      <SearchForm autocomplete={search.autocomplete} searchState={search.searchState} placesState={search.busy ? "loading" : search.placesState} error={search.error} onSearch={search.handleSearch} />
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted"><span>Try a suburb:</span>{["South Yarra VIC", "Footscray VIC"].map(query => <button key={query} disabled={search.busy} onClick={() => void search.handleSearch(query)} className="rounded-full border border-line px-3 py-2 text-ink-soft transition hover:border-accent hover:bg-accent-soft disabled:opacity-50">{query}</button>)}</div>
      {search.canSave && (search.recent.length > 0 || search.saved.length > 0) ? <details className="mt-4 text-sm text-ink-muted"><summary className="cursor-pointer">Your saved and recent locations</summary><RecentSearches recent={search.recent} saved={search.saved} disabled={search.busy} canSave={search.canSave} onSelect={search.searchFromHistory} onToggleSaved={search.toggleSaved} /></details> : null}
      {search.busy ? <p role="status" className="mt-4 text-sm font-medium text-accent-ink">{search.stage}</p> : null}
    </section>
    <aside className="overflow-hidden rounded-xl border border-line bg-surface">
      <div aria-hidden="true" className="relative flex aspect-[5/4] items-center justify-center overflow-hidden bg-accent-soft">
        <svg viewBox="0 0 480 380" className="h-full w-full"><path d="M0 75H480M0 185H480M0 295H480M110 0V380M255 0V380M390 0V380" stroke="currentColor" strokeWidth="14" className="text-surface"/><circle cx="255" cy="185" r="118" fill="none" stroke="currentColor" strokeDasharray="5 8" className="text-accent-line"/><circle cx="255" cy="185" r="62" fill="none" stroke="currentColor" className="text-accent-line"/>{[[110,75],[390,185],[255,295],[110,295]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="19" className="fill-surface"/><circle cx={x} cy={y} r="6" className="fill-accent"/></g>)}<circle cx="255" cy="185" r="29" className="fill-accent"/><path d="m242 184 13-11 13 11v15h-26Z" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-surface"/></svg>
        <span className="absolute left-4 top-4 rounded-full bg-surface px-3 py-1 text-xs text-ink-muted">Illustration · not a live map</span>
      </div>
      <div className="p-5 sm:p-6"><h2 className="text-base font-semibold text-ink">Your neighbourhood, at a glance</h2><p className="mt-2 text-sm leading-6 text-ink-muted">Your location and nearby places will appear here after a search.</p><div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-soft">{["Groceries", "Transport", "Food & cafés", "Health"].map(label=><span key={label} className="rounded-md bg-surface-subtle px-2.5 py-1.5">{label}</span>)}</div></div>
    </aside>
  </main>;
}
