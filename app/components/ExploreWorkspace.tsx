"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { getCoverage } from "@/app/lib/indicators";
import { isCategoryShown } from "@/app/lib/utils";
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
import { Welcome } from "./Welcome";

type MobileTab = "scores" | "places" | "map";

const mobileTabs: { id: MobileTab; label: string }[] = [
  { id: "scores", label: "Scores" },
  { id: "places", label: "Places" },
  { id: "map", label: "Map" },
];

const cardClass =
  "rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5";

// One page for one address: a scrolling column of cards beside a map that
// stays in view on desktop, and three tabs (Scores, Places, Map) on phones.
// The search, scores and saved lists come from ExploreProvider; this
// component owns only what is local to the page (selection, filters, tab).
export function ExploreWorkspace() {
  const search = useExplore();
  const pathname = usePathname();
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
    removeRecent,
    canSave,
  } = search;

  // A fresh object lets repeated clicks on the same place retrigger the map.
  const [selectedPlace, setSelectedPlace] = useState<{
    placeId: string;
  } | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("scores");
  // Categories the visitor picked, shared by the map chips and the list
  // chips so they agree. Empty means none picked: the map shows every
  // category. The map hides unpicked categories; the list keeps them all
  // and moves the picked ones to the top.
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
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
    setSelectedCategories(new Set());
    setMobileTab("scores");
  }

  const active = placesState === "loading" || placesState === "success";
  const hasResult = placesState === "success" && location !== null;
  const coverage = hasResult ? getCoverage(placeGroups) : null;
  const savedEntry = saved.find((item) => item.id === locationId) ?? null;

  // On phones the search card fills most of the first screen, so a new
  // result would land out of sight. Bring the score to the top instead;
  // scroll-padding-top in globals.css keeps it clear of the sticky header.
  // From lg up the result already sits beside the map, so nothing moves.
  useEffect(() => {
    if (hasResult && !window.matchMedia("(min-width: 1024px)").matches) {
      document.getElementById("result-header")?.scrollIntoView();
    }
  }, [hasResult, location]);

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
    // The list shows every category, so a place can be picked whose markers
    // are hidden on the map. Add its category so the marker is visible.
    const groupId = placeGroups.find((group) =>
      group.places.some((place) => place.id === placeId),
    )?.id;
    if (groupId && !isCategoryShown(selectedCategories, groupId)) {
      setSelectedCategories((current) => new Set(current).add(groupId));
    }
    setSelectedPlace({ placeId });
    setMobileTab("map");
  }

  function handleShowCategory(categoryId: string) {
    setSelectedCategories(new Set([categoryId]));
    setMobileTab("map");
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategories((current) => {
      const next = new Set(current);

      if (!next.delete(categoryId)) {
        next.add(categoryId);
      }

      return next;
    });
  }

  function showAllCategories() {
    setSelectedCategories(new Set());
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

  // The home page before a search is a simple welcome (search card and an
  // example result, no map). A location page always shows the workspace,
  // even while its stored evidence loads or when it fails to open.
  if (pathname === "/" && !active) {
    return (
      <>
        <Welcome onToggleSaved={handleToggleSaved} />
        <Toast toast={toast} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <>
      {/* From lg up the page is a split view: a fixed-width column of cards on
          the left and the map card filling the rest of the width and the
          full height under the header, with a small margin to the right and
          bottom edges. Each column carries its own padding instead of <main>,
          so the map's height is exactly one screen. Phones keep the single
          padded column. */}
      <main className="flex-1 px-4 pb-10 pt-4 sm:px-6 lg:p-0">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-0 xl:grid-cols-[800px_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5 lg:pb-10 lg:pl-8 lg:pr-6 lg:pt-4">
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
                onRemove={(entry) => void removeRecent(entry)}
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
                className="sticky top-14 z-30 -mx-4 grid grid-cols-3 gap-1 border-b border-line-soft bg-page px-4 py-2 sm:-mx-6 sm:px-6 lg:hidden print:hidden"
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
            ) : null}

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
                selectedCategories={selectedCategories}
                onToggleCategory={toggleCategory}
                onShowAllCategories={showAllCategories}
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
            className={`lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:self-start lg:pb-4 lg:pr-4 lg:pt-4 print:hidden ${
              active && mobileTab === "map"
                ? "h-[calc(100dvh-15rem)] min-h-96"
                : "max-lg:hidden"
            }`}
          >
            <LocationMap
              location={hasResult ? location : null}
              placeGroups={placeGroups}
              selectedPlace={selectedPlace}
              selectedCategories={selectedCategories}
              onToggleCategory={toggleCategory}
              onShowAllCategories={showAllCategories}
              onBackToList={handleBackToList}
            />
          </aside>
        </div>
      </main>
      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
