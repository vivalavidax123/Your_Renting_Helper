"use client";

import { getErrorMessage } from "@/app/lib/api";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import {
  createPlaceMarker,
  loadGoogleMaps,
  type GoogleMapsApi,
  type MarkerEntry,
} from "@/app/lib/maps/googleMaps";
import type { GeocodeLocation, PlaceGroup } from "@/app/lib/types";

type MapLocation = Pick<
  GeocodeLocation,
  "formattedAddress" | "latitude" | "longitude"
>;

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
  const [mapError, setMapError] = useState("");
  const [mapRevision, setMapRevision] = useState(0);
  const { theme } = useTheme();
  const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;

  const openEntry = useCallback((entry: MarkerEntry) => {
    const map = mapInstanceRef.current;

    if (!map) {
      return;
    }

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
          zoom: 14,
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

        new mapsApi.maps.Marker({
          position: center,
          map,
          title: location.formattedAddress,
          label: "H",
        });

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

  if (!apiKey) {
    return (
      <div className="mt-5 flex aspect-[4/3] items-center justify-center rounded-lg border border-line bg-surface-subtle p-5 text-center text-sm leading-6 text-ink-soft">
        The live map is unavailable. You can still explore scores and nearby
        places.
      </div>
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
      </div>
      {mapError ? (
        <p className="border-t border-danger-line bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink">
          {mapError}
        </p>
      ) : null}
    </div>
  );
}
