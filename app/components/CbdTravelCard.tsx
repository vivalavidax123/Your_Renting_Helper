"use client";

import { useEffect, useState } from "react";
import { isJsonRecord, readApiResult } from "@/app/lib/api";
import type { CbdTravel, GeocodeLocation, RequestState } from "@/app/lib/types";
import { formatDistance } from "@/app/lib/utils";
import { MethodNotes } from "./MethodNotes";

function isCbdTravelPayload(value: Record<string, unknown>) {
  const travel = value.travel;

  return (
    isJsonRecord(travel) &&
    typeof travel.distanceMeters === "number" &&
    (typeof travel.driveMinutes === "number" || travel.driveMinutes === null) &&
    (typeof travel.transitMinutes === "number" ||
      travel.transitMinutes === null) &&
    (typeof travel.warning === "string" || travel.warning === null)
  );
}

function formatMinutes(value: number | null) {
  if (value === null) return "Unavailable";

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
}

export function CbdTravelCard({ location }: { location: GeocodeLocation }) {
  const [state, setState] = useState<RequestState>("loading");
  const [travel, setTravel] = useState<CbdTravel | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadTravel() {
      setState("loading");
      setError("");

      try {
        const query = new URLSearchParams({
          lat: String(location.latitude),
          lng: String(location.longitude),
        });
        const response = await fetch(`/api/cbd-travel?${query}`, {
          signal: controller.signal,
        });
        const data = await readApiResult<{ travel: CbdTravel }>(
          response,
          isCbdTravelPayload,
        );

        if (controller.signal.aborted) return;

        if (!response.ok || !data.ok) {
          setState("error");
          setError(data.ok ? "Travel estimate is unavailable." : data.error);
          return;
        }

        setTravel(data.travel);
        setState("success");
      } catch {
        if (!controller.signal.aborted) {
          setState("error");
          setError("Travel estimate is unavailable.");
        }
      }
    }

    void loadTravel();
    return () => controller.abort();
  }, [location]);

  return (
    <div className="h-full rounded-lg border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">
        Commute to Melbourne CBD
      </h2>

      {state === "loading" ? (
        <p className="mt-4 text-sm font-medium text-ink-soft">
          Calculating CBD travel…
        </p>
      ) : null}

      {state === "error" ? (
        <p className="mt-4 rounded-lg border border-danger-line bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
          {error}
        </p>
      ) : null}

      {state === "success" && travel ? (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-surface-subtle p-3">
              <dt className="text-xs text-ink-muted">Public transport</dt>
              <dd className="mt-1 text-2xl font-semibold text-ink">
                {formatMinutes(travel.transitMinutes)}
              </dd>
            </div>
            <div className="rounded-lg bg-surface-subtle p-3">
              <dt className="text-xs text-ink-muted">Driving</dt>
              <dd className="mt-1 text-2xl font-semibold text-ink">
                {formatMinutes(travel.driveMinutes)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-ink-soft">
            Weekday 8 am timetable and free-flow traffic.{" "}
            {formatDistance(travel.distanceMeters)} in a straight line to Town
            Hall.
          </p>
          {travel.warning ? (
            <p className="mt-1 text-xs leading-5 text-ink-muted">
              {travel.warning}
            </p>
          ) : null}
          {travel.driveMinutes !== null || travel.transitMinutes !== null ? (
            <p className="mt-2 text-xs leading-5 text-ink-muted">
              Data:{" "}
              {travel.driveMinutes !== null ? (
                <>
                  <a
                    href="https://www.geoapify.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-ink-soft"
                  >
                    Geoapify
                  </a>
                  ,{" "}
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-ink-soft"
                  >
                    &copy; OpenStreetMap contributors
                  </a>
                  {travel.transitMinutes !== null ? ", " : "."}
                </>
              ) : null}
              {travel.transitMinutes !== null ? "Google Maps." : null}
            </p>
          ) : null}
          <MethodNotes>
            <li>
              Public transport uses the usual weekday timetable at 8:00 am
              Melbourne time.
            </li>
            <li>Driving assumes free-flow traffic.</li>
            <li>Both times are rounded to the nearest 5 minutes.</li>
            <li>Actual trips vary.</li>
          </MethodNotes>
        </>
      ) : null}
    </div>
  );
}
