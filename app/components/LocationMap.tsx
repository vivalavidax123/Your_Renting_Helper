"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPlaceMarker,
  loadGoogleMaps,
  type GoogleMapsApi,
  type MarkerEntry,
} from "../lib/maps/googleMaps";
import type { GeocodeLocation, PlaceGroup } from "../lib/types";

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
  location: MapLocation | null;
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
      if (!apiKey || !location || !mapRef.current) {
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
          fullscreenControl: false,
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
              createPlaceMarker(mapsApi, map, place, group, openEntry),
            );
          }
        }

        setMapError("");
      } catch (error) {
        if (isMounted) {
          setMapError(
            error instanceof Error ? error.message : "Google Maps failed to load.",
          );
        }
      }
    }

    void renderMap();

    return () => {
      isMounted = false;
    };
  }, [apiKey, location, placeGroups, openEntry]);

  useEffect(() => {
    const mapsApi = googleApiRef.current;
    const map = mapInstanceRef.current;

    if (!selectedPlace || !mapsApi || !map) {
      return;
    }

    let entry = markerEntriesRef.current.get(selectedPlace.placeId);

    if (!entry) {
      for (const group of placeGroups) {
        const place = group.places.find(
          (candidate) => candidate.id === selectedPlace.placeId,
        );

        if (place) {
          entry = createPlaceMarker(mapsApi, map, place, group, openEntry);
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
  }, [selectedPlace, placeGroups, openEntry, onAutoScroll]);

  if (!apiKey) {
    return (
      <div className="mt-5 flex aspect-[4/3] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-5 text-center text-sm leading-6 text-slate-600">
        Add NEXT_PUBLIC_MAPS_API_KEY to show the live map.
      </div>
    );
  }

  if (!location) {
    return (
      <div className="mt-5 flex aspect-[4/3] items-center justify-center rounded-lg border border-slate-200 bg-[#dfe8e3] p-5 text-center text-sm leading-6 text-slate-600">
        Search for a location to preview it on the map.
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <div ref={mapRef} className="aspect-[4/3] w-full scroll-mt-16" />
      {mapError ? (
        <p className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {mapError}
        </p>
      ) : null}
    </div>
  );
}
