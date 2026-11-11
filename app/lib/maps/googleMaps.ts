import "client-only";
import { categoryColor } from "@/app/lib/categories";
import type { Theme } from "@/app/lib/theme";
import type { NearbyPlace, PlaceGroup } from "@/app/lib/types";
import {
  estimateWalkMinutes,
  formatCompactCount,
  formatDepartureTime,
  formatDistance,
} from "@/app/lib/utils";

export type GoogleMapsApi = { maps: typeof google.maps };

declare global {
  interface Window {
    google?: GoogleMapsApi;
    rentScoreGoogleMapsReady?: () => void;
  }
}

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
  groupId: string;
  icon: google.maps.Symbol;
};

// Transport stops come from Transitland, so their ids are not Google Place
// IDs and cannot be linked.
function buildGoogleMapsUrl(place: NearbyPlace, groupId: string) {
  return groupId === "transport"
    ? null
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${place.name}, ${place.address}`,
      )}&query_place_id=${encodeURIComponent(place.id)}`;
}

function buildPopupHtml(place: NearbyPlace, group: PlaceGroup, color: string) {
  const googleMapsUrl = buildGoogleMapsUrl(place, group.id);
  const rating =
    group.id !== "transport" && place.rating !== null
      ? `<div class="map-info-window-meta">★ ${place.rating.toFixed(1)} (${formatCompactCount(place.userRatingCount)})</div>`
      : "";
  const departures = (place.transportServices ?? [])
    .slice(0, 2)
    .map((service) => {
      const time = formatDepartureTime(service.departureTime);

      return `<div class="map-info-window-meta"><strong>${escapeHtml(service.routeNumber)}</strong> to ${escapeHtml(service.destination)}${time ? ` · ${escapeHtml(time)}` : ""}</div>`;
    })
    .join("");

  return `
    <div class="map-info-window">
      <div class="map-info-window-category"><span style="background:${color}"></span>${escapeHtml(group.label)}</div>
      <strong>${escapeHtml(place.name)}</strong>
      ${rating}
      <div class="map-info-window-meta">${formatDistance(place.distanceMeters)} · ~${estimateWalkMinutes(place.distanceMeters)} min walk</div>
      <div class="map-info-window-address">${escapeHtml(place.address)}</div>
      ${departures}
      ${
        googleMapsUrl
          ? `<a class="map-info-window-link" href="${escapeHtml(googleMapsUrl)}" target="_blank" rel="noopener noreferrer" aria-label="View on Google Maps (opens in a new tab)">View on Google Maps <span aria-hidden="true">↗</span></a>`
          : ""
      }
    </div>
  `;
}

export function createPlaceMarker(
  mapsApi: GoogleMapsApi,
  map: google.maps.Map,
  place: NearbyPlace,
  group: PlaceGroup,
  theme: Theme,
  onMarkerClick: (entry: MarkerEntry) => void,
): MarkerEntry {
  const color = categoryColor(group.id);
  const position = { lat: place.latitude, lng: place.longitude };
  const icon: google.maps.Symbol = {
    path: mapsApi.maps.SymbolPath.CIRCLE,
    scale: place.source === "brand" ? 7 : 5,
    fillColor: color,
    fillOpacity: 0.9,
    strokeColor: theme === "dark" ? "#111821" : "#ffffff",
    strokeWeight: 2,
  };
  const marker = new mapsApi.maps.Marker({
    position,
    map,
    title: place.name,
    icon,
  });
  const infoWindow = new mapsApi.maps.InfoWindow({
    content: buildPopupHtml(place, group, color),
  });
  const entry = { marker, infoWindow, position, groupId: group.id, icon };

  marker.addListener("click", () => onMarkerClick(entry));

  return entry;
}

// The selected marker grows and rises above its neighbours.
export function setMarkerSelected(entry: MarkerEntry, selected: boolean) {
  entry.marker.setIcon(
    selected
      ? { ...entry.icon, scale: (entry.icon.scale ?? 5) * 1.5, fillOpacity: 1 }
      : entry.icon,
  );
  entry.marker.setZIndex(selected ? 900 : null);
}

export function createHomeMarker(
  mapsApi: GoogleMapsApi,
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  title: string,
  theme: Theme,
) {
  return new mapsApi.maps.Marker({
    position,
    map,
    title,
    zIndex: 1000,
    icon: {
      path: "M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z",
      anchor: new mapsApi.maps.Point(12, 22),
      scale: 1.7,
      fillColor: theme === "dark" ? "#34d399" : "#059669",
      fillOpacity: 1,
      strokeColor: theme === "dark" ? "#111821" : "#ffffff",
      strokeWeight: 2,
    },
  });
}

const walkRings = [
  { radiusMeters: 400, label: "~5 min" },
  { radiusMeters: 800, label: "~10 min" },
  { radiusMeters: 1200, label: "~15 min" },
];

// Straight-line walking rings with a label at each ring's north edge.
// Returned hidden; the caller shows them with setMap.
export function createWalkRings(
  mapsApi: GoogleMapsApi,
  center: google.maps.LatLngLiteral,
  theme: Theme,
): (google.maps.Circle | google.maps.Marker)[] {
  const color = theme === "dark" ? "#a7b2c2" : "#475569";

  return walkRings.flatMap((ring) => [
    new mapsApi.maps.Circle({
      center,
      radius: ring.radiusMeters,
      strokeColor: color,
      strokeOpacity: 0.7,
      strokeWeight: 1.5,
      fillColor: color,
      fillOpacity: 0.04,
      clickable: false,
    }),
    new mapsApi.maps.Marker({
      // One degree of latitude is about 111,320 metres.
      position: {
        lat: center.lat + ring.radiusMeters / 111320,
        lng: center.lng,
      },
      clickable: false,
      icon: { path: mapsApi.maps.SymbolPath.CIRCLE, scale: 0 },
      label: {
        text: ring.label,
        color,
        fontSize: "11px",
        fontWeight: "600",
      },
    }),
  ]);
}
