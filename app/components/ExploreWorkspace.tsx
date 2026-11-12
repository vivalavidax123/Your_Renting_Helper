"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import { getCoverage } from "@/app/lib/indicators";
import type { RecentSearch } from "@/app/lib/types";
import { AdditionalIndicators } from "./AdditionalIndicators";
import { ComparePanel } from "./ComparePanel";
import { useExplore } from "./ExploreProvider";
import { LocationAnalyst } from "./LocationAnalyst";
import { LocationMap } from "./LocationMap";
import { MoreEvidence } from "./MoreEvidence";
import { NearbyPlacesList } from "./NearbyPlacesList";
import { RecentSearches } from "./RecentSearches";
import { ResultHeader } from "./ResultHeader";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { SearchForm } from "./SearchForm";
import { Toast, type ToastMessage } from "./Toast";
import { MapPinIcon, SearchIcon, StarIcon } from "./icons";

type MobileTab = "scores" | "places" | "map";

const mobileTabs: { id: MobileTab; label: string }[] = [
  { id: "scores", label: "Scores" },
  { id: "places", label: "Places" },
  { id: "map", label: "Map" },
];

// Four different kinds of Melbourne area; commute times only cover Melbourne.
const exampleSearches = [
  "South Yarra VIC",
  "Footscray VIC",
  "Box Hill VIC",
  "Brunswick VIC",
];

const cardClass =
  "rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5";

function EmptyState({
  signedIn,
  onExample,
}: {
  signedIn: boolean;
  onExample: (query: string) => void;
}) {
  const steps = [
    { icon: <SearchIcon />, text: "Search an address or suburb" },
    { icon: <MapPinIcon />, text: "See scores for eight everyday categories" },
    {
      icon: <StarIcon />,
      text: signedIn
        ? "Save and compare rentals"
        : "Sign in to save and compare",
    },
  ];

  return (
    <section className={cardClass}>
      <p className="text-base leading-7 text-ink-soft">
        See what&apos;s walkable, how connected it is, and what daily life looks
        like around a rental. Best for Melbourne. No account needed.
      </p>
      <h2 className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Try an example
      </h2>
      <ul className="mt-2 flex flex-wrap gap-2">
        {exampleSearches.map((query) => (
          <li key={query}>
            <button
              type="button"
              onClick={() => onExample(query)}
              className="focus-ring min-h-9 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink-soft transition hover:border-accent-line hover:bg-accent-soft"
            >
              {query}
            </button>
          </li>
        ))}
      </ul>
      <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.text}
            className="flex items-start gap-2.5 rounded-lg bg-surface-subtle px-3 py-3 text-sm text-ink-soft"
          >
            <span className="mt-0.5 text-accent">{step.icon}</span>
            <span>
              <span className="sr-only">Step {index + 1}: </span>
              {step.text}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// One page for one address: a scrolling column of cards beside a map that
// stays in view on desktop, and three tabs (Scores, Places, Map) on phones.
// The search, scores and saved lists come from ExploreProvider; this
// component owns only what is local to the page (selection, filters, tab).
export function ExploreWorkspace() {
  const search = useExplore();
  const {
    location,
    locationId,
    placesState,
    placeGroups,
    categoryScores,
    overallScore,
    fetchedAt,
    saved,
    recent,
    toggleSaved,
    canSave,
  } = search;

  // A fresh object lets repeated clicks on the same place retrigger the map.
  const [selectedPlace, setSelectedPlace] = useState<{
    placeId: string;
  } | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("scores");
  // One set shared by the list filters and the map toggles so they agree.
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    new Set(),
  );
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  // A new location makes the selection, filters, and tab of the previous
  // one meaningless. Adjusting state during render (guarded by a
  // previous-value check) avoids an extra effect pass:
  // https://react.dev/learn/you-might-not-need-an-effect
  const [prevLocation, setPrevLocation] = useState(location);

  if (prevLocation !== location) {
    setPrevLocation(location);
    setSelectedPlace(null);
    setHiddenCategories(new Set());
    setMobileTab("scores");
  }

  const active = placesState === "loading" || placesState === "success";
  const hasResult = placesState === "success" && location !== null;
  const coverage = hasResult ? getCoverage(placeGroups) : null;
  const savedEntry = saved.find((item) => item.id === locationId) ?? null;

  function handleToggleSaved(entry: RecentSearch) {
    const wasSaved = entry.savedAt !== null;

    void toggleSaved(entry).then(() =>
      setToast(
        wasSaved
          ? {
              message: "Removed from saved",
              action: {
                label: "Undo",
                onClick: () => void toggleSaved({ ...entry, savedAt: null }),
              },
            }
          : { message: "Saved" },
      ),
    );
  }

  function toggleCurrentSaved() {
    if (!location || !locationId) {
      return;
    }

    handleToggleSaved(
      savedEntry ?? {
        ...location,
        id: locationId,
        lastSearchedAt: fetchedAt ?? "",
        savedAt: null,
        overallScore,
      },
    );
  }

  // Every result has its own address (/locations/...), so sharing is
  // copying the address bar.
  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast({ message: "Link copied" });
    } catch {
      setToast({ message: "Copy the link from the address bar" });
    }
  }

  function handleSelectPlace(placeId: string) {
    setSelectedPlace({ placeId });
    setMobileTab("map");
  }

  function handleShowCategory(categoryId: string) {
    setHiddenCategories(
      new Set(
        placeGroups
          .map((group) => group.id)
          .filter((groupId) => groupId !== categoryId),
      ),
    );
    setMobileTab("map");
  }

  function toggleCategory(categoryId: string) {
    setHiddenCategories((current) => {
      const next = new Set(current);

      if (!next.delete(categoryId)) {
        next.add(categoryId);
      }

      return next;
    });
  }

  function handleBackToList() {
    setMobileTab("places");

    // Wait for the list to be displayed again before scrolling to the row.
    window.requestAnimationFrame(() => {
      if (selectedPlace) {
        document
          .getElementById(`place-row-${selectedPlace.placeId}`)
          ?.scrollIntoView({ block: "center" });
      }
    });
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const offset =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;

    if (offset === 0) {
      return;
    }

    const index = mobileTabs.findIndex((tab) => tab.id === mobileTab);
    const next =
      mobileTabs[(index + offset + mobileTabs.length) % mobileTabs.length];

    setMobileTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  }

  // Below the desktop breakpoint only the selected tab's panel is shown;
  // print always shows every panel.
  const panelClass = (tab: MobileTab) =>
    active && mobileTab !== tab ? "max-lg:hidden print:block!" : "";

  return (
    <>
      <main className="flex-1 px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)]">
          <div className="min-w-0 space-y-5">
            <section className={`${cardClass} print:hidden`}>
              <SearchForm
                autocomplete={search.autocomplete}
                searchState={search.searchState}
                busy={search.busy}
                error={search.error}
                onSearch={search.handleSearch}
              />
              <RecentSearches
                recent={recent}
                saved={saved}
                disabled={search.busy}
                canSave={canSave}
                onSelect={search.searchFromHistory}
                onToggleSaved={handleToggleSaved}
              />
              {search.savedError ? (
                <p role="alert" className="mt-3 text-sm text-danger-ink">
                  {search.savedError}
                </p>
              ) : null}
            </section>

            <ResultHeader
              placesState={placesState}
              coverage={coverage}
              saved={canSave && locationId ? savedEntry !== null : null}
              onToggleSaved={toggleCurrentSaved}
              onShare={handleShare}
            />

            {active ? (
              <div
                role="tablist"
                aria-label="Result sections"
                onKeyDown={handleTabKeyDown}
                className="sticky top-14 z-30 -mx-4 grid grid-cols-3 gap-1 border-b border-line-soft bg-page/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden print:hidden"
              >
                {mobileTabs.map((tab) => (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={mobileTab === tab.id}
                    aria-controls={`panel-${tab.id}`}
                    tabIndex={mobileTab === tab.id ? 0 : -1}
                    onClick={() => setMobileTab(tab.id)}
                    className={`focus-ring min-h-10 rounded-lg text-sm transition ${
                      mobileTab === tab.id
                        ? "bg-surface font-semibold text-ink shadow-sm"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                signedIn={canSave}
                onExample={(query) => void search.handleSearch(query)}
              />
            )}

            <div
              id="panel-scores"
              role={active ? "tabpanel" : undefined}
              aria-labelledby={active ? "tab-scores" : undefined}
              className={`space-y-5 ${panelClass("scores")}`}
            >
              <ScoreBreakdown
                placesState={placesState}
                categoryScores={categoryScores}
                placeGroups={placeGroups}
                onSelectPlace={handleSelectPlace}
                onShowCategory={handleShowCategory}
              />
              <AdditionalIndicators
                placesState={placesState}
                categoryScores={categoryScores}
                placeGroups={placeGroups}
              />
              {hasResult ? (
                <>
                  <MoreEvidence
                    key={locationId ?? location.placeId}
                    location={location}
                    canContribute={canSave}
                  />
                  <section
                    className={`${cardClass} print:hidden [&>section]:mt-0 [&>section]:border-0 [&>section]:pt-0`}
                  >
                    <LocationAnalyst
                      key={locationId ?? "none"}
                      locationId={locationId}
                      profile={search.profile}
                      preset={search.preset}
                      placesState={placesState}
                      signedIn={canSave}
                      sessionPending={search.sessionPending}
                    />
                  </section>
                </>
              ) : null}
            </div>

            <div
              id="panel-places"
              role={active ? "tabpanel" : undefined}
              aria-labelledby={active ? "tab-places" : undefined}
              className={panelClass("places")}
            >
              <NearbyPlacesList
                placesState={placesState}
                placeGroups={placeGroups}
                categoryScores={categoryScores}
                selectedPlaceId={selectedPlace?.placeId ?? null}
                onSelectPlace={handleSelectPlace}
                hiddenCategories={hiddenCategories}
                onToggleCategory={toggleCategory}
                onShowAllCategories={() => setHiddenCategories(new Set())}
              />
            </div>

            <div className={panelClass("scores")}>
              <ComparePanel
                saved={saved}
                signedIn={canSave}
                profile={search.profile}
                preset={search.preset}
              />
            </div>
          </div>

          <aside
            id="panel-map"
            role={active ? "tabpanel" : undefined}
            aria-labelledby={active ? "tab-map" : undefined}
            aria-label={active ? undefined : "Map"}
            className={`lg:sticky lg:top-4 lg:block lg:h-[calc(100vh-2rem)] lg:max-h-[760px] lg:self-start print:hidden ${
              active && mobileTab === "map"
                ? "h-[calc(100dvh-15rem)] min-h-96"
                : "max-lg:hidden"
            }`}
          >
            <LocationMap
              location={hasResult ? location : null}
              placeGroups={placeGroups}
              selectedPlace={selectedPlace}
              hiddenCategories={hiddenCategories}
              onToggleCategory={toggleCategory}
              onBackToList={handleBackToList}
            />
          </aside>
        </div>
      </main>
      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
