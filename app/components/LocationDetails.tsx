"use client";
import { useExplore } from "./ExploreProvider";
import { LocationHeader } from "./LocationHeader";
import { CbdTravelCard } from "./CbdTravelCard";
import { WalkingCard } from "./WalkingCard";
import { RentalInsights } from "./RentalInsights";
import { TerrainCard } from "./TerrainCard";
// Four equal cards: one column on phones, a 2x2 grid from lg up. Rent is not
// first because most addresses have no community reports yet.
export function LocationDetails() {
  const { location, canSave, locationId, categoryScores, placeGroups } =
    useExplore();
  // Rendered only inside LocationLoader, so the location is always present;
  // the guard narrows the type for the cards below.
  if (!location) return null;
  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-8 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-line bg-surface p-5">
        <LocationHeader title="Commute, walking, rent and terrain" />
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section id="commute" className="min-w-0 scroll-mt-4">
          <CbdTravelCard location={location} />
        </section>
        <section id="walking" className="min-w-0 scroll-mt-4">
          <WalkingCard
            categoryScores={categoryScores}
            placeGroups={placeGroups}
          />
        </section>
        <section id="rent" className="min-w-0 scroll-mt-4">
          <RentalInsights
            key={locationId}
            location={location}
            canContribute={canSave}
          />
        </section>
        <section id="terrain" className="min-w-0 scroll-mt-4">
          <TerrainCard location={location} />
        </section>
      </div>
    </main>
  );
}
