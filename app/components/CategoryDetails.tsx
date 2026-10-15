"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useExplore } from "./ExploreProvider";
import { LocationHeader } from "./LocationHeader";
import { NearbyPlacesList } from "./NearbyPlacesList";
import { LocationMap } from "./LocationMap";
import { rentScoreCategories } from "@/app/lib/categories";
import { formatEvidenceDate } from "@/app/lib/utils";
export function CategoryDetails({ categoryId }: { categoryId: string }) {
  const {
    categoryScores,
    placeGroups,
    location,
    locationId,
    profile,
    scoringParams,
    fetchedAt,
    handleSearch,
    busy,
  } = useExplore();
  const [selected, setSelected] = useState<{ placeId: string } | null>(null);
  const [returnVisible, setReturnVisible] = useState(false);
  const autoScroll = useCallback(() => setReturnVisible(true), []);
  // On phones the category row scrolls sideways; keep the current one in view.
  const currentPill = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    currentPill.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [categoryId]);
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
        <nav
          aria-label="Categories"
          className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
        >
          {rentScoreCategories.map((category) => (
            <Link
              key={category.id}
              ref={category.id === categoryId ? currentPill : undefined}
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
                "shrink-0 rounded-full border px-3 py-2 text-xs " +
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
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised"
            aria-hidden="true"
          >
            <div
              className={"h-full rounded-full " + score.colorClass}
              style={{ width: score.score + "%" }}
            />
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            {score.weight
              ? score.weight + "% of the overall score"
              : "Useful context; not counted in the overall score"}
            {" · "}
            {profile === "carOwner" ? "Car owner" : "No car"} profile
          </p>
          <h2 className="mt-5 font-semibold text-ink">Why this score?</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            {score.explanation}
          </p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs leading-5 text-ink-muted">
            <li>{score.detail}.</li>
            <li>Distances are direct estimates, not walking routes.</li>
          </ul>
          <NearbyPlacesList
            placeGroups={groups}
            selectedPlaceId={selected?.placeId ?? null}
            onSelectPlace={(placeId) => setSelected({ placeId })}
          />
        </section>
        <section className="min-w-0 rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-4">
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
          Evidence from {formatEvidenceDate(fetchedAt)}.{" "}
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
