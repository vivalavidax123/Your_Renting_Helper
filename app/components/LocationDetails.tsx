"use client";
import { useExplore } from "./ExploreProvider";
import { LocationHeader } from "./LocationHeader";
import { CbdTravelCard } from "./CbdTravelCard";
import { TerrainCard } from "./TerrainCard";
import { RentalInsights } from "./RentalInsights";
import { AdditionalIndicators } from "./AdditionalIndicators";
export function LocationDetails() {
  const { location, canSave, locationId, categoryScores, placeGroups } =
    useExplore();
  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-8 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-line bg-surface p-5">
        <LocationHeader title="More about this location" />
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section id="commute" className="min-w-0 scroll-mt-4">
          <CbdTravelCard location={location} />
        </section>
        <section id="rent" className="min-w-0 scroll-mt-4">
          <RentalInsights
            key={locationId}
            location={location}
            canContribute={canSave}
          />
        </section>
        <section id="terrain" className="min-w-0 scroll-mt-4 lg:col-span-2">
          <TerrainCard location={location} />
        </section>
        <section id="indicators" className="min-w-0 scroll-mt-4 lg:col-span-2">
          <AdditionalIndicators
            placesState="success"
            categoryScores={categoryScores}
            placeGroups={placeGroups}
          />
        </section>
      </div>
    </main>
  );
}
