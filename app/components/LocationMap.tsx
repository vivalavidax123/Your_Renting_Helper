"use client";

import { getErrorMessage } from "@/app/lib/api";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { categoryColor } from "@/app/lib/categories";
import {
  createHomeMarker,
  createPlaceMarker,
  createWalkRings,
  loadGoogleMaps,
  setMarkerSelected,
  type GoogleMapsApi,
  type MarkerEntry,
} from "@/app/lib/maps/googleMaps";
import type { GeocodeLocation, PlaceGroup } from "@/app/lib/types";
import { TargetIcon, WalkIcon } from "./icons";

type MapLocation = Pick<
  GeocodeLocation,
  "formattedAddress" | "latitude" | "longitude"
>;

const defaultZoom = 14;

const overlayChipClass =
  "focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-md transition";

// Drawn stand-in for when the map cannot load (no key in local or
// self-hosted setups), so the card is not a large empty box.
function MapPlaceholder({ message }: { message: string }) {
  return (
    <div className="mt-5 flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-lg border border-line bg-surface-subtle p-5 text-center">
      <svg
        viewBox="0 0 240 180"
        aria-hidden="true"
        className="w-full max-w-56 text-line-strong"
      >
        <g stroke="currentColor" strokeWidth="5" strokeLinecap="round">
          <path d="M10 60 230 45M10 130l220 12M75 10l14 160M170 10l-8 160" />
        </g>
        <g fill="none" className="stroke-ink-faint" strokeWidth="1.5">
          <circle cx="120" cy="92" r="34" />
          <circle cx="120" cy="92" r="66" />
        </g>
        <circle cx="150" cy="70" r="6" fill="#10b981" />
        <circle cx="88" cy="118" r="6" fill="#0ea5e9" />
        <circle cx="100" cy="62" r="6" fill="#f59e0b" />
        <circle cx="168" cy="124" r="6" fill="#f43f5e" />
        <path
          d="M120 70c-8 0-14 6-14 14 0 10 14 24 14 24s14-14 14-24c0-8-6-14-14-14z"
          className="fill-accent"
        />
      </svg>
      <p className="max-w-xs text-sm leading-6 text-ink-soft">{message}</p>
    </div>
  );
}

export function LocationMap({
  location,
  placeGroups,
  selectedPlace,
  onAutoScroll,
}: {
  location: MapLocation;
  placeGroups: PlaceGroup[];
  selectedPlace: { placeId: string } | null;
  onAutoScroll: () => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const googleApiRef = useRef<GoogleMapsApi | null>(null);
  const markerEntriesRef = useRef(new Map<string, MarkerEntry>());
  const openInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const selectedEntryRef = useRef<MarkerEntry | null>(null);
  const walkRingsRef = useRef<(google.maps.Circle | google.maps.Marker)[]>([]);
  const [mapError, setMapError] = useState("");
  const [mapRevision, setMapRevision] = useState(0);
  const [showRings, setShowRings] = useState(false);
  // Map-only filter: which categories' markers are switched off. It lives
  // here because nothing outside the map reads it.
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    () => new Set(),
  );
  const { theme } = useTheme();
  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;

  const openEntry = useCallback((entry: MarkerEntry) => {
    const map = mapInstanceRef.current;

    if (!map) {
      return;
    }

    if (selectedEntryRef.current) {
      setMarkerSelected(selectedEntryRef.current, false);
    }

    setMarkerSelected(entry, true);
    selectedEntryRef.current = entry;
    openInfoWindowRef.current?.close();
    entry.infoWindow.open({ anchor: entry.marker, map });
    openInfoWindowRef.current = entry.infoWindow;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function renderMap() {
      if (!apiKey || !mapRef.current || !theme) {
        return;
      }

      try {
        const mapsApi = await loadGoogleMaps(apiKey);

        if (!isMounted || !mapRef.current) {
          return;
        }

        const center = { lat: location.latitude, lng: location.longitude };
        const map = new mapsApi.maps.Map(mapRef.current, {
          center,
          zoom: defaultZoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          colorScheme:
            theme === "dark"
              ? mapsApi.maps.ColorScheme.DARK
              : mapsApi.maps.ColorScheme.LIGHT,
        });

        googleApiRef.current = mapsApi;
        mapInstanceRef.current = map;
        markerEntriesRef.current = new Map();
        openInfoWindowRef.current = null;
        selectedEntryRef.current = null;
        walkRingsRef.current = createWalkRings(mapsApi, center, theme);

        createHomeMarker(
          mapsApi,
          map,
          center,
          location.formattedAddress,
          theme,
        );

        for (const group of placeGroups) {
          for (const place of group.places.slice(0, 8)) {
            markerEntriesRef.current.set(
              place.id,
              createPlaceMarker(mapsApi, map, place, group, theme, openEntry),
            );
          }
        }

        setMapError("");
        setMapRevision((revision) => revision + 1);
      } catch (error) {
        if (isMounted) {
          setMapError(getErrorMessage(error, "Google Maps failed to load."));
        }
      }
    }

    void renderMap();

    return () => {
      isMounted = false;
    };
  }, [apiKey, location, placeGroups, theme, openEntry]);

  useEffect(() => {
    const mapsApi = googleApiRef.current;
    const map = mapInstanceRef.current;

    if (!selectedPlace || !mapsApi || !map || !theme) {
      return;
    }

    let entry = markerEntriesRef.current.get(selectedPlace.placeId);

    if (!entry) {
      for (const group of placeGroups) {
        const place = group.places.find(
          (candidate) => candidate.id === selectedPlace.placeId,
        );

        if (place) {
          entry = createPlaceMarker(
            mapsApi,
            map,
            place,
            group,
            theme,
            openEntry,
          );
          markerEntriesRef.current.set(place.id, entry);
          break;
        }
      }
    }

    if (!entry) {
      return;
    }

    // A selected place is shown even when its category is switched off.
    entry.marker.setMap(map);
    map.panTo(entry.position);
    openEntry(entry);

    const mapElement = mapRef.current;

    if (mapElement) {
      const rect = mapElement.getBoundingClientRect();
      const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

      if (!fullyVisible) {
        mapElement.scrollIntoView({ behavior: "smooth", block: "start" });
        onAutoScroll();
      }
    }
  }, [selectedPlace, placeGroups, theme, mapRevision, openEntry, onAutoScroll]);

  useEffect(() => {
    const map = mapInstanceRef.current;

    if (!map) {
      return;
    }

    for (const entry of markerEntriesRef.current.values()) {
      entry.marker.setMap(hiddenCategories.has(entry.groupId) ? null : map);
    }
  }, [hiddenCategories, mapRevision]);

  useEffect(() => {
    const map = mapInstanceRef.current;

    for (const ring of walkRingsRef.current) {
      ring.setMap(showRings && map ? map : null);
    }
  }, [showRings, mapRevision]);

  function toggleCategory(categoryId: string) {
    setHiddenCategories((current) => {
      const next = new Set(current);

      if (!next.delete(categoryId)) {
        next.add(categoryId);
      }

      return next;
    });
  }

  function recenter() {
    const map = mapInstanceRef.current;

    if (map) {
      map.panTo({ lat: location.latitude, lng: location.longitude });
      map.setZoom(defaultZoom);
    }
  }

  if (!apiKey) {
    return (
      <MapPlaceholder message="The live map is unavailable. You can still explore scores and nearby places." />
    );
  }

  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-line bg-surface-raised">
      <div className="relative">
        <div ref={mapRef} className="aspect-[4/3] w-full scroll-mt-16" />
        {mapRevision === 0 && !mapError ? (
          <p
            role="status"
            className="absolute inset-0 flex items-center justify-center text-sm text-ink-muted"
          >
            Loading map…
          </p>
        ) : null}

        {/* Right margin keeps the chips clear of Google's fullscreen button. */}
        <div className="absolute left-2 right-14 top-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <button
            type="button"
            aria-pressed={showRings}
            onClick={() => setShowRings((value) => !value)}
            title="Straight-line walking distance rings"
            className={
              overlayChipClass +
              " " +
              (showRings
                ? "border-accent-line bg-accent-soft text-accent-ink"
                : "border-line bg-surface text-ink-soft")
            }
          >
            <WalkIcon className="size-3.5" />
            Walk rings
          </button>
          {placeGroups.length > 1
            ? placeGroups.map((group) => {
                const hidden = hiddenCategories.has(group.id);
                const color = categoryColor(group.id);

                return (
                  <button
                    key={group.id}
                    type="button"
                    aria-pressed={!hidden}
                    onClick={() => toggleCategory(group.id)}
                    className={
                      overlayChipClass +
                      " border-line bg-surface " +
                      (hidden ? "text-ink-faint line-through" : "text-ink-soft")
                    }
                  >
                    <span
                      className="size-2 rounded-full border"
                      style={{
                        borderColor: color,
                        backgroundColor: hidden ? "transparent" : color,
                      }}
                    />
                    {group.label}
                  </button>
                );
              })
            : null}
        </div>

        <button
          type="button"
          onClick={recenter}
          aria-label="Recentre on the searched location"
          title="Recentre on the searched location"
          className="focus-ring absolute bottom-6 left-2 flex size-9 items-center justify-center rounded-full border border-line bg-surface text-ink-soft shadow-md hover:text-ink"
        >
          <TargetIcon />
        </button>
      </div>
      {mapError ? (
        <p className="border-t border-danger-line bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink">
          {mapError}
        </p>
      ) : null}
    </div>
  );
}
