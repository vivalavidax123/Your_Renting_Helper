"use client";

import { useCallback, useState } from "react";
import { authClient } from "./lib/auth-client";
import { useLocationSearch } from "./hooks/useLocationSearch";
import { useSavedSearches } from "./hooks/useSavedSearches";
import { AuthStatus } from "./components/AuthStatus";
import { ComparePanel } from "./components/ComparePanel";
import { LocationMap } from "./components/LocationMap";
import { SearchForm } from "./components/SearchForm";
import { ScoreBreakdown } from "./components/ScoreBreakdown";
import { NearbyPlacesList } from "./components/NearbyPlacesList";
import { AdditionalIndicators } from "./components/AdditionalIndicators";
import { RecentSearches } from "./components/RecentSearches";
import { ThemeToggle } from "./components/ThemeToggle";
import { CbdTravelCard } from "./components/CbdTravelCard";
import { RentalInsights } from "./components/RentalInsights";
import { LocationAnalyst } from "./components/LocationAnalyst";

export default function Home() {
  const {
    autocomplete,
    searchState,
    location,
    error,
    placesState,
    placeGroups,
    categoryScores,
    overallScore,
    propertyId,
    placesError,
    resultFromCache,
    profile,
    changeProfile,
    handleSearch,
    searchFromHistory,
  } = useLocationSearch();

  const { data: session } = authClient.useSession();

  const { recent, saved, toggleSaved } = useSavedSearches(
    placesState,
    session?.user.id ?? null,
  );

  // A fresh object lets repeated clicks on the same place retrigger the map.
  const [selectedPlace, setSelectedPlace] = useState<{ placeId: string } | null>(
    null,
  );

  // Shown only after the page actually auto-scrolled to the map, so the
  // user has a one-tap way back to the row they were reading.
  const [showReturnButton, setShowReturnButton] = useState(false);

  const handleAutoScroll = useCallback(() => setShowReturnButton(true), []);

  // A new search replaces the rows the button would return to, so drop the
  // button as soon as results start reloading. Adjusting state during render
  // (guarded by a previous-value check) avoids an extra effect pass:
  // https://react.dev/learn/you-might-not-need-an-effect
  const [prevPlacesState, setPrevPlacesState] = useState(placesState);

  if (prevPlacesState !== placesState) {
    setPrevPlacesState(placesState);

    if (placesState !== "success") {
      setShowReturnButton(false);
    }
  }

  function returnToSelectedRow() {
    if (selectedPlace) {
      document
        .getElementById(`place-row-${selectedPlace.placeId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    setShowReturnButton(false);
  }

  return (
    <main className="min-h-screen bg-page px-4 py-5 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto mb-3 flex max-w-7xl items-center justify-end gap-3">
        <ThemeToggle />
        <AuthStatus />
      </div>
      <section className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-lg border border-line bg-surface p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-tight text-ink">
                Your Renting Helper
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
                Compare everyday convenience, transport access, food, health,
                fitness, and practical services around a rental.
              </p>
            </div>

            <div className="grid w-full grid-cols-[auto_1fr] items-center gap-3 rounded-lg border border-accent-line bg-accent-soft px-4 py-3 text-left sm:w-52">
              <div className="flex size-16 items-center justify-center rounded-full border-[6px] border-accent bg-surface">
                <span className="text-2xl font-bold text-accent-ink">
                  {placesState === "loading" ? "..." : overallScore ?? "--"}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-accent-ink">
                  {placesState === "success" ? "Overall score" : "Ready to score"}
                </p>
                <p className="text-xs font-medium text-accent-ink">out of 100</p>
              </div>
            </div>
          </div>

          <SearchForm
            autocomplete={autocomplete}
            searchState={searchState}
            placesState={placesState}
            error={error}
            onSearch={handleSearch}
          />

          <RecentSearches
            recent={recent}
            saved={saved}
            disabled={placesState === "loading"}
            canSave={session !== null && session !== undefined}
            onSelect={searchFromHistory}
            onToggleSaved={toggleSaved}
          />

          <ScoreBreakdown
            placesState={placesState}
            categoryScores={categoryScores}
            placesError={placesError}
            resultFromCache={resultFromCache}
            profile={profile}
            onProfileChange={changeProfile}
          />

          <LocationAnalyst
            key={`${propertyId ?? "no-location"}-${profile}`}
            propertyId={propertyId}
            profile={profile}
            placesState={placesState}
          />

          <NearbyPlacesList
            placesState={placesState}
            placesError={placesError}
            placeGroups={placeGroups}
            selectedPlaceId={selectedPlace?.placeId ?? null}
            onSelectPlace={(placeId) => setSelectedPlace({ placeId })}
          />
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink">Location preview</h2>
            <LocationMap
              location={location}
              placeGroups={placeGroups}
              selectedPlace={selectedPlace}
              onAutoScroll={handleAutoScroll}
            />
            <p className="mt-4 text-sm leading-6 text-ink-soft">
              {location
                ? `Matched as ${location.locationType.toLowerCase().replaceAll("_", " ")}. Map markers show the searched location and nearby amenities using each category radius.`
                : "Search for a location to show nearby amenities on the map."}
            </p>
          </div>

          <CbdTravelCard location={location} />

          <RentalInsights
            key={location?.placeId ?? "no-location"}
            location={location}
            canContribute={Boolean(session)}
          />

          <ComparePanel saved={saved} profile={profile} />

          <AdditionalIndicators
            placesState={placesState}
            categoryScores={categoryScores}
            placeGroups={placeGroups}
          />
        </aside>
      </section>

      {showReturnButton ? (
        <button
          type="button"
          onClick={returnToSelectedRow}
          aria-label="Back to the amenity you were viewing"
          title="Back to the amenity you were viewing"
          className="fixed bottom-6 right-6 z-50 flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-lg transition hover:bg-surface-raised hover:text-ink"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
            aria-hidden="true"
          >
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10a6 6 0 0 1 6 6v5" />
          </svg>
        </button>
      ) : null}
    </main>
  );
}
