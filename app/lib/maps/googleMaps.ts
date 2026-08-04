import "client-only";
import type { NearbyPlace, PlaceGroup } from "../types";
import { formatDistance } from "../utils";

export type GoogleMapsApi = { maps: typeof google.maps };

declare global {
  interface Window {
    google?: GoogleMapsApi;
    rentScoreGoogleMapsReady?: () => void;
  }
}

const categoryColors: Record<string, string> = {
  shopping_centres: "#14b8a6",
  groceries: "#10b981",
  food: "#f59e0b",
  transport: "#0ea5e9",
  health: "#f43f5e",
  fitness: "#8b5cf6",
  fuel: "#f97316",
  services: "#6366f1",
};

let googleMapsPromise: Promise<GoogleMapsApi> | null = null;

export function loadGoogleMaps(apiKey: string) {
  if (window.google) {
    return Promise.resolve(window.google);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    window.rentScoreGoogleMapsReady = () => {
      if (window.google) {
        resolve(window.google);
      } else {
        reject(new Error("Google Maps loaded without an API object."));
      }
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&callback=rentScoreGoogleMapsReady&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

export type MarkerEntry = {
  marker: google.maps.Marker;
  infoWindow: google.maps.InfoWindow;
  position: google.maps.LatLngLiteral;
};

export function createPlaceMarker(
  mapsApi: GoogleMapsApi,
  map: google.maps.Map,
  place: NearbyPlace,
  group: PlaceGroup,
  onMarkerClick: (entry: MarkerEntry) => void,
): MarkerEntry {
  const color = categoryColors[group.id] ?? "#334155";
  const position = { lat: place.latitude, lng: place.longitude };
  const marker = new mapsApi.maps.Marker({
    position,
    map,
    title: place.name,
    icon: {
      path: mapsApi.maps.SymbolPath.CIRCLE,
      scale: place.source === "brand" ? 7 : 5,
      fillColor: color,
      fillOpacity: 0.9,
      strokeColor: "#ffffff",
      strokeWeight: 2,
    },
  });
  const infoWindow = new mapsApi.maps.InfoWindow({
    content: `
      <div style="max-width:220px">
        <strong>${escapeHtml(place.name)}</strong>
        <div>${escapeHtml(group.label)} · ${formatDistance(place.distanceMeters)}</div>
        <div style="margin-top:4px;color:#475569">${escapeHtml(place.address)}</div>
      </div>
    `,
  });
  const entry = { marker, infoWindow, position };

  marker.addListener("click", () => onMarkerClick(entry));

  return entry;
}
