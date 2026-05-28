"use client";

import { FormEvent, useState } from "react";

const scoreCategories = [
  {
    name: "Shopping",
    score: 82,
    detail: "Supermarkets and retail within easy reach",
    color: "bg-emerald-500",
  },
  {
    name: "Food & Cafes",
    score: 76,
    detail: "Good coverage of cafes, restaurants, and bakeries",
    color: "bg-amber-500",
  },
  {
    name: "Transport",
    score: 65,
    detail: "Useful public transport, but not every route is close",
    color: "bg-sky-500",
  },
  {
    name: "Health",
    score: 70,
    detail: "Pharmacies and clinics nearby for everyday needs",
    color: "bg-rose-500",
  },
  {
    name: "Fitness",
    score: 45,
    detail: "Limited gyms and fitness options in walking distance",
    color: "bg-violet-500",
  },
];

type GeocodeLocation = {
  query: string;
  formattedAddress: string;
  placeId: string;
  latitude: number;
  longitude: number;
  locationType: string;
  types: string[];
};

type GeocodeSuccess = {
  ok: true;
  location: GeocodeLocation;
};

type GeocodeFailure = {
  ok: false;
  error: string;
  status?: string;
};

type SearchState = "idle" | "loading" | "success" | "error";

type NearbyPlace = {
  id: string;
  name: string;
  address: string;
  primaryType: string;
  distanceMeters: number;
};

type PlaceGroup = {
  id: string;
  label: string;
  places: NearbyPlace[];
};

type PlacesSuccess = {
  ok: true;
  groups: PlaceGroup[];
};

type PlacesFailure = {
  ok: false;
  error: string;
};

type PlacesState = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [location, setLocation] = useState<GeocodeLocation | null>(null);
  const [error, setError] = useState("");
  const [placesState, setPlacesState] = useState<PlacesState>("idle");
  const [placeGroups, setPlaceGroups] = useState<PlaceGroup[]>([]);
  const [placesError, setPlacesError] = useState("");

  async function loadNearbyPlaces(nextLocation: GeocodeLocation) {
    setPlacesState("loading");
    setPlacesError("");
    setPlaceGroups([]);

    try {
      const response = await fetch(
        `/api/places?lat=${nextLocation.latitude}&lng=${nextLocation.longitude}`,
      );
      const data = (await response.json()) as PlacesSuccess | PlacesFailure;

      if (!response.ok || !data.ok) {
        setPlacesError(data.ok ? "Could not load nearby places." : data.error);
        setPlacesState("error");
        return;
      }

      setPlaceGroups(data.groups);
      setPlacesState("success");
    } catch {
      setPlacesError("Nearby places failed to load. Try searching again.");
      setPlacesState("error");
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 3) {
      setError("Enter at least 3 characters to search.");
      setSearchState("error");
      return;
    }

    setSearchState("loading");
    setError("");
    setPlacesState("idle");
    setPlacesError("");
    setPlaceGroups([]);

    try {
      const response = await fetch(
        `/api/geocode?query=${encodeURIComponent(trimmedQuery)}`,
      );
      const data = (await response.json()) as GeocodeSuccess | GeocodeFailure;

      if (!response.ok || !data.ok) {
        setError(data.ok ? "Could not geocode this location." : data.error);
        setSearchState("error");
        return;
      }

      setLocation(data.location);
      setSearchState("success");
      await loadNearbyPlaces(data.location);
    } catch {
      setError("Search failed. Check your connection and try again.");
      setSearchState("error");
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f6f4] px-5 py-8 text-slate-950 sm:px-8 lg:px-10">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
                Rental location insight
              </p>
              <h1 className="max-w-2xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
                Rent Convenience Score
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Compare how practical a rental location is for everyday errands,
                transport, food, health, and fitness.
              </p>
            </div>

            <div className="w-full rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-left sm:w-40">
              <p className="text-sm font-medium text-emerald-800">Example score</p>
              <p className="mt-1 text-4xl font-bold text-emerald-950">72</p>
              <p className="text-sm text-emerald-800">out of 100</p>
            </div>
          </div>

          <form
            className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-inner"
            onSubmit={handleSearch}
          >
            <label
              htmlFor="location"
              className="mb-2 block text-sm font-semibold text-slate-800"
            >
              Address or suburb
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="location"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try: Parramatta NSW"
                autoComplete="street-address"
                className="min-h-12 flex-1 rounded-md border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />
              <button
                type="submit"
                disabled={searchState === "loading"}
                className="min-h-12 rounded-md bg-slate-950 px-6 text-base font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {searchState === "loading" ? "Searching..." : "Search"}
              </button>
            </div>
            {searchState === "error" ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}
            {searchState === "success" && location ? (
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                <p className="font-semibold">{location.formattedAddress}</p>
                <p className="mt-1 text-emerald-800">
                  {location.latitude.toFixed(5)},{" "}
                  {location.longitude.toFixed(5)}
                </p>
              </div>
            ) : null}
          </form>

          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-950">Score breakdown</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                Prototype data
              </span>
            </div>

            <div className="space-y-4">
              {scoreCategories.map((category) => (
                <article
                  key={category.name}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-950">
                        {category.name}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {category.detail}
                      </p>
                    </div>
                    <p className="shrink-0 text-lg font-bold text-slate-950">
                      {category.score}/100
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${category.color}`}
                      style={{ width: `${category.score}%` }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Location preview</h2>
            <div className="mt-5 aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-[#dfe8e3]">
              <div className="grid h-full grid-cols-3 grid-rows-3 gap-1 p-3">
                <div className="rounded-md bg-white/70" />
                <div className="rounded-md bg-emerald-200" />
                <div className="rounded-md bg-white/70" />
                <div className="rounded-md bg-sky-200" />
                <div className="relative rounded-md bg-white shadow-sm">
                  <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-emerald-600 shadow-md" />
                </div>
                <div className="rounded-md bg-white/70" />
                <div className="rounded-md bg-white/70" />
                <div className="rounded-md bg-amber-200" />
                <div className="rounded-md bg-white/70" />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {location
                ? `Matched as ${location.locationType.toLowerCase().replaceAll("_", " ")}. Nearby amenities are loaded within 1.6 km.`
                : "A live map can show nearby amenities once the search and places API are connected."}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-950">
                Nearby signals
              </h2>
              {placesState === "loading" ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                  Loading
                </span>
              ) : null}
            </div>

            {placesState === "idle" ? (
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Search for a location to load nearby amenities.
              </p>
            ) : null}

            {placesState === "error" ? (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {placesError}
              </p>
            ) : null}

            {placesState === "success" ? (
              <div className="mt-4 space-y-4">
                {placeGroups.map((group) => (
                  <section key={group.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-950">
                        {group.label}
                      </h3>
                      <span className="text-xs font-medium text-slate-500">
                        {group.places.length} found
                      </span>
                    </div>
                    {group.places.length > 0 ? (
                      <ul className="space-y-2">
                        {group.places.slice(0, 3).map((place) => (
                          <li
                            key={place.id}
                            className="rounded-md bg-slate-50 px-4 py-3 text-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-medium text-slate-800">
                                {place.name}
                              </span>
                              <span className="shrink-0 text-xs font-semibold text-emerald-700">
                                {place.distanceMeters < 1000
                                  ? `${place.distanceMeters} m`
                                  : `${(place.distanceMeters / 1000).toFixed(1)} km`}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {place.address}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">
                        No nearby matches found.
                      </p>
                    )}
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}
