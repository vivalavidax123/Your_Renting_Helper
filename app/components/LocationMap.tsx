"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/app/lib/api";
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
import { ArrowLeftIcon, MapPinIcon, TargetIcon, WalkIcon } from "./icons";

type MapLocation = Pick<
  GeocodeLocation,
  "formattedAddress" | "latitude" | "longitude"
>;

const defaultZoom = 14;

const overlayChipClass =
  "focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-md transition";

// Decorative stand-in shown before the first search, so no map request is
// made (or billed) until there is something to show. From lg up the map
// fills the right side of the page edge to edge, so both it and the live
// map drop the card corners and keep only a left border as a divider.
function MapPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-80 flex-col items-center justify-center gap-4 rounded-xl border border-line bg-surface p-6 text-center shadow-sm lg:rounded-none lg:border-0 lg:border-l lg:shadow-none">
      <svg
        viewBox="0 0 240 180"
        aria-hidden="true"
        className="w-full max-w-64 text-line-strong"
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
      <p className="max-w-xs text-sm leading-6 text-ink-muted">{message}</p>
    </div>
  );
}

export function LocationMap({
  location,
  placeGroups,
  selectedPlace,
  hiddenCategories,
  onToggleCategory,
  onBackToList,
}: {
  location: MapLocation | null;
  placeGroups: PlaceGroup[];
  selectedPlace: { placeId: string } | null;
  hiddenCategories: Set<string>;
  onToggleCategory: (categoryId: string) => void;
  onBackToList: () => void;
}) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const googleApiRef = useRef<GoogleMapsApi | null>(null);
  const markerEntriesRef = useRef(new Map<string, MarkerEntry>());
  const openInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const selectedEntryRef = useRef<MarkerEntry | null>(null);
  const walkRingsRef = useRef<(google.maps.Circle | google.maps.Marker)[]>([]);
  // Where the map should be centred when it becomes visible again.
  const focusRef = useRef<google.maps.LatLngLiteral | null>(null);
  const [mapError, setMapError] = useState("");
  const [mapRevision, setMapRevision] = useState(0);
  const [showRings, setShowRings] = useState(false);
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
      if (!apiKey || !location || !mapRef.current || !theme) {
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
        focusRef.current = center;
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

    // A selected place is shown even when its category is toggled off.
    entry.marker.setMap(map);
    focusRef.current = entry.position;
    map.panTo(entry.position);
    openEntry(entry);
  }, [selectedPlace, placeGroups, theme, mapRevision, openEntry]);

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

  // On small screens the map lives in a tab that starts hidden. A map
  // created at zero size centres on the wrong point, so recentre the first
  // time it gains a real size.
  useEffect(() => {
    const element = mapRef.current;
    const map = mapInstanceRef.current;

    if (!element || !map) {
      return;
    }

    let wasHidden = element.clientWidth === 0;
    const observer = new ResizeObserver(() => {
      const isHidden = element.clientWidth === 0;

      if (wasHidden && !isHidden && focusRef.current) {
        map.setCenter(focusRef.current);
      }

      wasHidden = isHidden;
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [mapRevision]);

  function recenter() {
    const map = mapInstanceRef.current;

    if (map && location) {
      const center = { lat: location.latitude, lng: location.longitude };

      focusRef.current = center;
      map.panTo(center);
      map.setZoom(defaultZoom);
    }
  }

  if (!apiKey) {
    return (
      <MapPlaceholder message="The live map is unavailable. You can still explore scores and nearby places." />
    );
  }

  if (!location) {
    return (
      <MapPlaceholder message="Your map appears here, with every nearby amenity marked by category." />
    );
  }

  return (
    <div className="relative flex h-full min-h-80 flex-col overflow-hidden rounded-xl border border-line bg-surface-raised shadow-sm lg:rounded-none lg:border-0 lg:border-l lg:shadow-none">
      <div ref={mapRef} className="min-h-0 w-full flex-1" />

      {/* Right margin keeps the chips clear of Google's fullscreen button. */}
      <div className="absolute left-2 right-14 top-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        <button
          type="button"
          aria-pressed={showRings}
          onClick={() => setShowRings((value) => !value)}
          title="Straight-line walking distance rings"
          className={`${overlayChipClass} ${
            showRings
              ? "border-accent-line bg-accent-soft text-accent-ink"
              : "border-line bg-surface text-ink-soft"
          }`}
        >
          <WalkIcon className="size-3.5" />
          Walk rings
        </button>
        {placeGroups.map((group) => {
          const hidden = hiddenCategories.has(group.id);

          return (
            <button
              key={group.id}
              type="button"
              aria-pressed={!hidden}
              onClick={() => onToggleCategory(group.id)}
              className={`${overlayChipClass} border-line bg-surface ${
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
              {group.label}
            </button>
          );
        })}
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

      {selectedPlace ? (
        <button
          type="button"
          onClick={onBackToList}
          className="focus-ring absolute bottom-6 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink shadow-lg lg:hidden"
        >
          <ArrowLeftIcon />
          Back to list
        </button>
      ) : null}

      {mapError ? (
        <p className="flex items-center gap-2 border-t border-danger-line bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink">
          <MapPinIcon />
          {mapError}
        </p>
      ) : null}
    </div>
  );
}
