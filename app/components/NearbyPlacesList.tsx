"use client";

import { useState } from "react";
import { categoryColor } from "@/app/lib/categories";
import type {
  CategoryScore,
  NearbyPlace,
  PlaceGroup,
  RequestState,
} from "@/app/lib/types";
import {
  estimateWalkMinutes,
  formatCompactCount,
  formatDepartureTime,
  formatDistance,
  formatPlaceType,
  formatSearchScope,
  scoreBand,
  scoreBandClasses,
} from "@/app/lib/utils";
import { BusIcon, CategoryTile, StarIcon, TrainIcon } from "./icons";

type NearbyPlacesListProps = {
  placesState: RequestState;
  placeGroups: PlaceGroup[];
  categoryScores: CategoryScore[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  hiddenCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
  onShowAllCategories: () => void;
};

type SortOrder = "reviews" | "closest" | "rating";

const sortOptions: { id: SortOrder; label: string }[] = [
  { id: "reviews", label: "Most reviewed" },
  { id: "closest", label: "Closest" },
  { id: "rating", label: "Highest rated" },
];

const collapsedRowCount = 3;

const filterChipClass =
  "focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition";

// The API already returns places most-reviewed first, so that order is
// kept as-is and only the other two orders sort a copy.
function sortPlaces(places: NearbyPlace[], order: SortOrder) {
  if (order === "closest") {
    return [...places].sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  if (order === "rating") {
    return [...places].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  return places;
}

function PlaceRow({
  place,
  groupId,
  selected,
  onSelect,
}: {
  place: NearbyPlace;
  groupId: string;
  selected: boolean;
  onSelect: (placeId: string) => void;
}) {
  const isTransport = groupId === "transport";
  const services = isTransport ? (place.transportServices ?? []) : [];

  return (
    <li id={`place-row-${place.id}`} className="py-1 text-sm">
      <button
        type="button"
        aria-current={selected ? "true" : undefined}
        onClick={() => onSelect(place.id)}
        style={selected ? { borderColor: categoryColor(groupId) } : undefined}
        className={`focus-ring block w-full rounded-md border-l-[3px] px-2 py-1.5 text-left ${
          selected ? "bg-accent-soft" : "border-transparent hover:bg-hover"
        }`}
      >
        <span className="flex items-center gap-2">
          {isTransport ? (
            place.primaryType === "bus_stop" ? (
              <BusIcon className="size-3.5 text-ink-muted" />
            ) : (
              <TrainIcon className="size-3.5 text-ink-muted" />
            )
          ) : null}
          <span
            className={`min-w-0 flex-1 truncate font-medium ${
              selected ? "text-accent-ink" : "text-ink"
            }`}
          >
            {place.name}
          </span>
          {!isTransport && place.rating !== null ? (
            <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-ink-soft">
              <StarIcon filled className="size-3 text-amber-500" />
              {place.rating.toFixed(1)}
              <span className="text-ink-muted">
                ({formatCompactCount(place.userRatingCount)})
              </span>
            </span>
          ) : null}
          <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-ink-soft">
            {formatDistance(place.distanceMeters)}
          </span>
        </span>
        <span className="mt-0.5 flex items-baseline gap-2 text-xs text-ink-muted">
          <span className="min-w-0 flex-1 truncate">
            <span className="capitalize">
              {formatPlaceType(place.primaryType)}
            </span>
            {place.address ? ` · ${place.address}` : ""}
          </span>
          <span className="shrink-0 tabular-nums">
            ~{estimateWalkMinutes(place.distanceMeters)} min walk
          </span>
        </span>
      </button>
      {services.length > 0 ? (
        <ul className="mb-1 ml-3 mt-1 space-y-1">
          {services.map((service) => {
            const departureTime = formatDepartureTime(service.departureTime);

            return (
              <li
                key={`${service.routeNumber}-${service.destination}`}
                className="flex items-center gap-2 text-xs leading-4 text-ink-soft"
              >
                <span className="min-w-8 rounded bg-sky-500/15 px-1.5 py-0.5 text-center font-semibold tabular-nums text-sky-700 dark:text-sky-300">
                  {service.routeNumber}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  to {service.destination}
                </span>
                {departureTime ? (
                  <span className="shrink-0 tabular-nums text-ink-muted">
                    {departureTime}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

// Expansion is deliberately local state: no other component cares whether
// this category is expanded, so the state lives at the lowest level that
// reads it — the opposite call to the lifted saved-searches list.
function CategorySection({
  group,
  score,
  sortOrder,
  selectedPlaceId,
  onSelectPlace,
}: {
  group: PlaceGroup;
  score: number | undefined;
  sortOrder: SortOrder;
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const places = sortPlaces(group.places, sortOrder);
  // The selected row stays visible even when it is past the collapsed cut.
  const selectedIsHidden =
    places.findIndex((place) => place.id === selectedPlaceId) >=
    collapsedRowCount;
  const showAll = expanded || selectedIsHidden;
  const visiblePlaces = showAll ? places : places.slice(0, collapsedRowCount);
  const hiddenCount = places.length - collapsedRowCount;

  const services = group.places.flatMap(
    (place) => place.transportServices ?? [],
  );
  const routeCount = new Set(services.map((service) => service.routeNumber))
    .size;

  return (
    <section className="rounded-lg border border-line bg-surface px-3 py-3">
      <div className="flex items-center gap-2.5">
        <CategoryTile categoryId={group.id} color={categoryColor(group.id)} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ink">{group.label}</h3>
          <p className="truncate text-xs text-ink-muted">
            {formatSearchScope(group)}
          </p>
        </div>
        {score !== undefined ? (
          <span
            className={`text-sm font-semibold tabular-nums ${scoreBandClasses[scoreBand(score).band].text}`}
            title="Category score"
          >
            {score}
          </span>
        ) : null}
      </div>
      {group.id === "transport" && services.length > 0 ? (
        <p className="mt-2 text-xs text-ink-soft">
          {services.length} upcoming departure{services.length === 1 ? "" : "s"}{" "}
          listed · {routeCount} route{routeCount === 1 ? "" : "s"}
        </p>
      ) : null}
      {places.length > 0 ? (
        <>
          <ul className="mt-1.5 divide-y divide-line-soft">
            {visiblePlaces.map((place) => (
              <PlaceRow
                key={place.id}
                place={place}
                groupId={group.id}
                selected={place.id === selectedPlaceId}
                onSelect={onSelectPlace}
              />
            ))}
          </ul>
          {hiddenCount > 0 && !selectedIsHidden ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              className="focus-ring mt-1 min-h-8 w-full rounded-md text-xs font-medium text-ink-muted hover:bg-hover hover:text-ink print:hidden"
            >
              {expanded ? "Show top 3" : `Show all ${places.length}`}
            </button>
          ) : null}
        </>
      ) : (
        <p className="py-3 text-sm text-ink-muted">No nearby matches found.</p>
      )}
    </section>
  );
}

function SkeletonSections() {
  return (
    <div
      aria-hidden="true"
      className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className={`space-y-3 rounded-lg border border-line px-3 py-3 motion-safe:animate-pulse ${index > 1 ? "max-md:hidden" : ""}`}
        >
          <div className="flex items-center gap-2.5">
            <span className="size-8 rounded-lg bg-surface-raised" />
            <span className="h-3 w-28 rounded bg-surface-raised" />
          </div>
          {Array.from({ length: 3 }, (_, row) => (
            <div key={row} className="space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-surface-raised" />
              <div className="h-2.5 w-1/2 rounded bg-surface-raised" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function NearbyPlacesList({
  placesState,
  placeGroups,
  categoryScores,
  selectedPlaceId,
  onSelectPlace,
  hiddenCategories,
  onToggleCategory,
  onShowAllCategories,
}: NearbyPlacesListProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("reviews");

  if (placesState === "idle" || placesState === "error") {
    return null;
  }

  const allPlaces = placeGroups.flatMap((group) => group.places);
  const nearestDistance =
    allPlaces.length > 0
      ? Math.min(...allPlaces.map((place) => place.distanceMeters))
      : null;
  const walkableCount = allPlaces.filter(
    (place) => estimateWalkMinutes(place.distanceMeters) <= 10,
  ).length;

  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Nearby amenities</h2>
          {placesState === "success" ? (
            <p className="mt-0.5 text-sm text-ink-soft">
              {allPlaces.length} found
              {nearestDistance !== null
                ? ` · nearest ${formatDistance(nearestDistance)}`
                : ""}
              {` · ${walkableCount} within ~10 min walk`}
            </p>
          ) : null}
        </div>
        {placesState === "success" ? (
          <label className="flex items-center gap-2 text-xs font-medium text-ink-muted print:hidden">
            Sort
            <select
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(event.target.value as SortOrder)
              }
              className="focus-ring rounded-md border border-line bg-control px-2 py-1.5 text-sm font-normal text-ink"
            >
              {sortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {placesState === "loading" ? <SkeletonSections /> : null}

      {placesState === "success" ? (
        <>
          <div
            role="group"
            aria-label="Show categories"
            className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] scroll-rail sm:mx-0 sm:flex-wrap sm:px-0 print:hidden"
          >
            <button
              type="button"
              aria-pressed={hiddenCategories.size === 0}
              onClick={onShowAllCategories}
              className={`${filterChipClass} ${
                hiddenCategories.size === 0
                  ? "border-accent-line bg-accent-soft text-accent-ink"
                  : "border-line text-ink-soft hover:bg-hover"
              }`}
            >
              All {allPlaces.length}
            </button>
            {placeGroups.map((group) => {
              const hidden = hiddenCategories.has(group.id);

              return (
                <button
                  key={group.id}
                  type="button"
                  aria-pressed={!hidden}
                  onClick={() => onToggleCategory(group.id)}
                  className={`${filterChipClass} border-line hover:bg-hover ${
                    hidden ? "text-ink-faint line-through" : "text-ink-soft"
                  }`}
                >
                  <span
                    className="size-2 rounded-full border"
                    style={{
                      borderColor: categoryColor(group.id),
                      backgroundColor: hidden
                        ? "transparent"
                        : categoryColor(group.id),
                    }}
                  />
                  {group.label} {group.places.length}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {placeGroups
              .filter((group) => !hiddenCategories.has(group.id))
              .map((group) => (
                <CategorySection
                  key={group.id}
                  group={group}
                  score={
                    categoryScores.find((score) => score.id === group.id)?.score
                  }
                  sortOrder={sortOrder}
                  selectedPlaceId={selectedPlaceId}
                  onSelectPlace={onSelectPlace}
                />
              ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
