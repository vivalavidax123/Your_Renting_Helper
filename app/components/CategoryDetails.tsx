"use client";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useExplore } from "./ExploreProvider";
import { LocationHeader } from "./LocationHeader";
import { NearbyPlacesList } from "./NearbyPlacesList";
import { LocationMap } from "./LocationMap";
import { rentScoreCategories } from "@/app/lib/categories";
import { formatGroupScope } from "@/app/lib/utils";
export function CategoryDetails({ categoryId }: { categoryId: string }) {
  const {
    categoryScores,
    placeGroups,
    location,
    locationId,
    scoringParams,
    fetchedAt,
    handleSearch,
    busy,
  } = useExplore();
  const [selected, setSelected] = useState<{ placeId: string } | null>(null);
  const [returnVisible, setReturnVisible] = useState(false);
  const autoScroll = useCallback(() => setReturnVisible(true), []);
  const groups = useMemo(
    () => placeGroups.filter((group) => group.id === categoryId),
    [placeGroups, categoryId],
  );
  const score = categoryScores.find((score) => score.id === categoryId);
  if (!score)
    return (
      <p className="p-6">
        Category evidence is unavailable. Search this location again.
      </p>
    );
  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-8 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-line bg-surface p-5">
        <LocationHeader title={score.label} />
        <nav aria-label="Categories" className="mt-4 flex flex-wrap gap-2">
          {rentScoreCategories.map((category) => (
            <Link
              key={category.id}
              aria-current={category.id === categoryId ? "page" : undefined}
              href={
                "/locations/" +
                locationId +
                "/categories/" +
                category.id +
                "?" +
                scoringParams
              }
              className={
                "rounded-full border px-3 py-2 text-xs " +
                (category.id === categoryId
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-line text-ink-soft hover:bg-hover")
              }
            >
              {category.label}
            </Link>
          ))}
        </nav>
      </section>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-line bg-surface p-5">
          <p className="text-4xl font-bold text-accent-ink">
            {score.score}
            <span className="text-sm font-normal"> /100</span>
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {score.weight
              ? score.weight + "% of the overall score"
              : "Useful context; not counted in the overall score"}
          </p>
          <h2 className="mt-5 font-semibold text-ink">Why this score?</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {score.explanation}
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs leading-5 text-ink-muted">
            <li>{score.detail}.</li>
            {groups[0] ? <li>{formatGroupScope(groups[0])}.</li> : null}
            <li>Distances are direct estimates, not walking routes.</li>
          </ul>
          <NearbyPlacesList
            placesState="success"
            placesError=""
            placeGroups={groups}
            selectedPlaceId={selected?.placeId ?? null}
            onSelectPlace={(placeId) => setSelected({ placeId })}
            singleColumn
          />
        </section>
        <section className="min-w-0 rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold text-ink">{score.label} on the map</h2>
          <LocationMap
            location={location}
            placeGroups={groups}
            selectedPlace={selected}
            onAutoScroll={autoScroll}
          />
        </section>
      </div>
      {fetchedAt ? (
        <p className="text-xs text-ink-muted">
          Evidence from{" "}
          {new Date(fetchedAt).toLocaleDateString("en-AU", { timeZone: "UTC" })}
          .{" "}
          <button
            disabled={busy}
            className="underline disabled:opacity-50"
            onClick={() => void handleSearch(location!.query)}
          >
            Search this location again
          </button>
        </p>
      ) : null}
      {returnVisible ? (
        <button
          className="fixed bottom-5 right-5 rounded-full border border-line bg-surface px-4 py-3 text-sm text-ink shadow-lg"
          onClick={() => {
            document
              .getElementById("place-row-" + selected?.placeId)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
            setReturnVisible(false);
          }}
        >
          Back to selected place ↑
        </button>
      ) : null}
    </main>
  );
}
