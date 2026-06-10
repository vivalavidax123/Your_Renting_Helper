import type { PlaceGroup, PlacesState } from "../lib/types";
import {
  formatGroupScope,
  formatDistance,
  formatReviewSummary,
  formatPlaceType,
  formatDepartureTime,
} from "../lib/utils";

type NearbyPlacesListProps = {
  placesState: PlacesState;
  placesError: string;
  placeGroups: PlaceGroup[];
};

export function NearbyPlacesList({
  placesState,
  placesError,
  placeGroups,
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
    <div className="mt-6 border-t border-slate-200 pt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Nearby amenities</h2>
          {placesState === "success" ? (
            <p className="mt-1 text-sm text-slate-600">
              {allPlaces.length} found
              {closestPlace ? ` / nearest ${formatDistance(closestPlace.distanceMeters)}` : ""}
            </p>
          ) : null}
        </div>
        {placesState === "loading" ? (
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            Loading
          </span>
        ) : null}
      </div>

      {placesState === "idle" ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-600">
          Search for a location to load nearby amenities.
        </p>
      ) : null}

      {placesState === "error" ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {placesError}
        </p>
      ) : null}

      {placesState === "success" ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {placeGroups.map((group) => (
            <section
              key={group.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-950">
                  {group.label}
                </h3>
                <span className="text-xs font-medium text-slate-500">
                  {formatGroupScope(group)}
                </span>
              </div>
              {group.places.length > 0 ? (
                <ul className="space-y-1.5">
                  {group.places.slice(0, 5).map((place) => (
                    <li
                      key={place.id}
                      className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="line-clamp-1 font-medium text-slate-800">
                          {place.name}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-emerald-700">
                          {formatDistance(place.distanceMeters)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {group.id !== "transport" ? (
                          <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                            {formatReviewSummary(place)}
                          </span>
                        ) : null}
                        <span className="text-[11px] text-slate-500">
                          {formatPlaceType(place.primaryType)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-slate-500">
                        {place.address}
                      </p>
                      {group.id === "transport" &&
                      place.primaryType === "bus_stop" &&
                      place.transportServices?.length ? (
                        <ul className="mt-2 space-y-1">
                          {place.transportServices.map((service) => {
                            const departureTime = formatDepartureTime(
                              service.departureTime,
                            );

                            return (
                              <li
                                key={`${service.routeNumber}-${service.destination}`}
                                className="flex items-center gap-2 text-[11px] leading-4 text-slate-600"
                              >
                                <span className="min-w-8 rounded bg-sky-100 px-1.5 py-0.5 text-center font-semibold text-sky-800">
                                  {service.routeNumber}
                                </span>
                                <span className="min-w-0 flex-1 truncate">
                                  to {service.destination}
                                </span>
                                {departureTime ? (
                                  <span className="shrink-0 text-slate-500">
                                    {departureTime}
                                  </span>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  No nearby matches found.
                </p>
              )}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
