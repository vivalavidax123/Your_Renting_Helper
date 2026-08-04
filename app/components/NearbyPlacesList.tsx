"use client";

import { useState } from "react";
import type { NearbyPlace, PlaceGroup, RequestState } from "../lib/types";
import {
  formatGroupScope,
  formatDistance,
  formatReviewSummary,
  formatPlaceType,
  formatDepartureTime,
} from "../lib/utils";

type NearbyPlacesListProps = {
  placesState: RequestState;
  placesError: string;
  placeGroups: PlaceGroup[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
};

const collapsedRowCount = 3;

// Compact single-line row. Address and place type are low-priority, so
// they move to a hover tooltip instead of taking up rows of their own.
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
  const showServices =
    groupId === "transport" &&
    place.primaryType === "bus_stop" &&
    (place.transportServices?.length ?? 0) > 0;

  return (
    <li
      id={`place-row-${place.id}`}
      className="py-1 text-sm"
      title={`${formatPlaceType(place.primaryType)} · ${place.address}`}
    >
      <button
        type="button"
        onClick={() => onSelect(place.id)}
        className={`flex w-full items-center gap-2 rounded-md px-1 py-1 text-left ${
          selected ? "bg-accent-soft" : "hover:bg-hover"
        }`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selected ? "font-medium text-accent-ink" : "text-ink-soft"
          }`}
        >
          {place.name}
        </span>
        {groupId !== "transport" ? (
          <span className="shrink-0 text-[11px] text-ink-faint">
            {formatReviewSummary(place)}
          </span>
        ) : null}
        <span className="shrink-0 text-xs font-medium text-ink-soft">
          {formatDistance(place.distanceMeters)}
        </span>
      </button>
      {showServices ? (
        <ul className="mt-1.5 space-y-1">
          {place.transportServices?.map((service) => {
            const departureTime = formatDepartureTime(service.departureTime);

            return (
              <li
                key={`${service.routeNumber}-${service.destination}`}
                className="flex items-center gap-2 text-[11px] leading-4 text-ink-soft"
              >
                <span className="min-w-8 rounded bg-surface-raised px-1.5 py-0.5 text-center font-semibold text-ink-soft">
                  {service.routeNumber}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  to {service.destination}
                </span>
                {departureTime ? (
                  <span className="shrink-0 text-ink-muted">{departureTime}</span>
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
  selectedPlaceId,
  onSelectPlace,
}: {
  group: PlaceGroup;
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const visiblePlaces = expanded
    ? group.places
    : group.places.slice(0, collapsedRowCount);
  const hiddenCount = group.places.length - collapsedRowCount;

  return (
    <section className="rounded-lg border border-line bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{group.label}</h3>
        <span className="text-xs text-ink-faint">{formatGroupScope(group)}</span>
      </div>
      {group.places.length > 0 ? (
        <>
          <ul className="mt-1 divide-y divide-line-soft">
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
          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-1 w-full rounded-md py-1 text-xs font-medium text-ink-muted hover:text-ink"
            >
              {expanded ? "Show top 3" : `Show all ${group.places.length}`}
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
  placesState,
  placesError,
  placeGroups,
  selectedPlaceId,
  onSelectPlace,
}: NearbyPlacesListProps) {
  const allPlaces = placeGroups.flatMap((group) => group.places);
  const closestPlace = allPlaces.reduce<(typeof allPlaces)[number] | null>(
    (closest, place) => {
      if (!closest || place.distanceMeters < closest.distanceMeters) {
        return place;
      }

      return closest;
    },
    null,
  );

  return (
    <div className="mt-6 border-t border-line pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Nearby amenities</h2>
          {placesState === "success" ? (
            <p className="mt-1 text-sm text-ink-soft">
              {allPlaces.length} found
              {closestPlace ? ` / nearest ${formatDistance(closestPlace.distanceMeters)}` : ""}
            </p>
          ) : null}
        </div>
        {placesState === "loading" ? (
          <span className="w-fit rounded-full bg-surface-raised px-3 py-1 text-sm font-medium text-ink-soft">
            Loading
          </span>
        ) : null}
      </div>

      {placesState === "idle" ? (
        <p className="mt-3 rounded-lg border border-line bg-surface-subtle px-3 py-2.5 text-sm leading-6 text-ink-soft">
          Search for a location to load nearby amenities.
        </p>
      ) : null}

      {placesState === "error" ? (
        <p className="mt-4 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm font-medium text-danger-ink">
          {placesError}
        </p>
      ) : null}

      {placesState === "success" ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {placeGroups.map((group) => (
            <CategorySection
              key={group.id}
              group={group}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={onSelectPlace}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
