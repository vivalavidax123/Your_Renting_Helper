"use client";
import { useExplore } from "./ExploreProvider";
import { ResultHeading } from "./ResultHeading";
import { CbdTravelCard } from "./CbdTravelCard";
import { RentalInsights } from "./RentalInsights";
import { AdditionalIndicators } from "./AdditionalIndicators";
export function SupportingDetails() {
  const { location, canSave, propertyId, categoryScores, placeGroups } =
    useExplore();
  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-8 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-line bg-surface p-5">
        <ResultHeading title="More about this location" />
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section id="commute" className="min-w-0 scroll-mt-4">
          <CbdTravelCard location={location} />
        </section>
        <section id="rent" className="min-w-0 scroll-mt-4">
          <RentalInsights
            key={propertyId}
            location={location}
            canContribute={canSave}
          />
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
