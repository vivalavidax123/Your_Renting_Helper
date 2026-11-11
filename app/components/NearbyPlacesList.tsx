"use client";

import { useState } from "react";
import { categoryColor } from "@/app/lib/categories";
import type { NearbyPlace, PlaceGroup } from "@/app/lib/types";
import {
  estimateWalkMinutes,
  formatCompactCount,
  formatDepartureTime,
  formatDistance,
  formatPlaceType,
  formatSearchScope,
} from "@/app/lib/utils";
import { BusIcon, StarIcon, TrainIcon } from "./icons";

type NearbyPlacesListProps = {
  placeGroups: PlaceGroup[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
};

type SortOrder = "reviews" | "closest" | "rating";

const sortOptions: { id: SortOrder; label: string }[] = [
  { id: "reviews", label: "Most reviewed" },
  { id: "closest", label: "Closest" },
  { id: "rating", label: "Highest rated" },
];

const collapsedRowCount = 10;

// The API already returns places most-reviewed first, so that order is
// kept as it is and only the other two orders sort a copy.
function sortPlaces(places: NearbyPlace[], order: SortOrder) {
  if (order === "closest") {
    return [...places].sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  if (order === "rating") {
    return [...places].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  return places;
}

// Two-line row: name, rating and distance first, then type, address and an
// estimated walk. The selected row gets a bar in the category colour, which
// matches its enlarged marker on the map.
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
  const services =
    isTransport && place.primaryType === "bus_stop"
      ? (place.transportServices ?? [])
      : [];

  return (
    <li id={`place-row-${place.id}`} className="py-1 text-sm">
      <button
        type="button"
        onClick={() => onSelect(place.id)}
        aria-pressed={selected}
        style={selected ? { borderColor: categoryColor(groupId) } : undefined}
        className={
          "focus-ring block w-full rounded-md border-l-[3px] px-2 py-1.5 text-left " +
          (selected ? "bg-accent-soft" : "border-transparent hover:bg-hover")
        }
      >
        <span className="flex items-center gap-2">
          {isTransport ? (
            place.primaryType === "bus_stop" ? (
              <BusIcon className="size-3.5 shrink-0 text-ink-muted" />
            ) : (
              <TrainIcon className="size-3.5 shrink-0 text-ink-muted" />
            )
          ) : null}
          <span
            className={
              "min-w-0 flex-1 truncate font-medium " +
              (selected ? "text-accent-ink" : "text-ink")
            }
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

// Expansion and sort order are deliberately local state: no other component
// cares about them, so they live at the lowest level that reads them.
function CategorySection({
  group,
  selectedPlaceId,
  onSelectPlace,
}: {
  group: PlaceGroup;
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("reviews");

  const places = sortPlaces(group.places, sortOrder);
  // A place picked on the map stays visible even past the collapsed cut.
  const selectedIsHidden =
    places.findIndex((place) => place.id === selectedPlaceId) >=
    collapsedRowCount;
  const showAll = expanded || selectedIsHidden;
  const visiblePlaces = showAll ? places : places.slice(0, collapsedRowCount);
  const hiddenCount = places.length - collapsedRowCount;

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">Nearby places</h3>
          <p className="text-xs text-ink-muted">{formatSearchScope(group)}</p>
        </div>
        {places.length > 1 ? (
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
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              className="focus-ring mt-1 min-h-8 w-full rounded-md text-xs font-medium text-ink-muted hover:bg-hover hover:text-ink print:hidden"
            >
              {expanded
                ? `Show top ${collapsedRowCount}`
                : `Show all ${places.length}`}
            </button>
          ) : null}
        </>
      ) : (
        <p className="py-2 text-sm text-ink-muted">No nearby matches found.</p>
      )}
    </section>
  );
}

export function NearbyPlacesList({
  placeGroups,
  selectedPlaceId,
  onSelectPlace,
}: NearbyPlacesListProps) {
  return (
    <div className="mt-5 space-y-3 border-t border-line pt-5">
      {placeGroups.map((group) => (
        <CategorySection
          key={group.id}
          group={group}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={onSelectPlace}
        />
      ))}
    </div>
  );
}
