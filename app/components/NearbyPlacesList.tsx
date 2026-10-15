"use client";

import { useState } from "react";
import type { NearbyPlace, PlaceGroup } from "@/app/lib/types";
import {
  formatGroupScope,
  formatDistance,
  formatReviewSummary,
  formatPlaceType,
  formatDepartureTime,
} from "@/app/lib/utils";

type NearbyPlacesListProps = {
  placeGroups: PlaceGroup[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
};

const collapsedRowCount = 10;

// Two-line row: name and distance first, then type and reviews in small
// text so neither squeezes the name. The address only appears once a place
// is selected, which keeps ten rows short enough to scan.
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
    <li id={`place-row-${place.id}`} className="py-1 text-sm">
      <button
        type="button"
        onClick={() => onSelect(place.id)}
        aria-pressed={selected}
        className={`w-full rounded-md px-1 py-1 text-left ${
          selected ? "bg-accent-soft" : "hover:bg-hover"
        }`}
      >
        <span className="flex items-center gap-2">
          <span
            className={`min-w-0 flex-1 truncate ${
              selected ? "font-medium text-accent-ink" : "text-ink"
            }`}
          >
            {place.name}
          </span>
          <span className="shrink-0 text-xs font-medium text-ink-soft">
            {formatDistance(place.distanceMeters)}
          </span>
        </span>
        <span className="block truncate text-xs text-ink-muted">
          <span className="capitalize">
            {formatPlaceType(place.primaryType)}
          </span>
          {groupId !== "transport" ? " · " + formatReviewSummary(place) : ""}
        </span>
        {selected ? (
          <span className="block text-xs text-ink-muted">{place.address}</span>
        ) : null}
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
                  <span className="shrink-0 text-ink-muted">
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
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">Nearby places</h3>
        <span className="text-xs text-ink-faint">
          {formatGroupScope(group)}
        </span>
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
              aria-expanded={expanded}
              className="mt-1 w-full rounded-md py-1 text-xs font-medium text-ink-muted hover:text-ink"
            >
              {expanded
                ? `Show top ${collapsedRowCount}`
                : `Show all ${group.places.length}`}
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
