"use client";

import { useEffect, useState } from "react";
import { isJsonRecord, readApiResult } from "@/app/lib/api";
import type { CbdTravel, GeocodeLocation, RequestState } from "@/app/lib/types";
import { formatDistance } from "@/app/lib/utils";

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

export function CbdTravelCard({
  location,
}: {
  location: GeocodeLocation | null;
}) {
  const [state, setState] = useState<RequestState>("idle");
  const [travel, setTravel] = useState<CbdTravel | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!location) {
      return;
    }

    const controller = new AbortController();

    async function loadTravel() {
      setState("loading");
      setError("");

      try {
        const query = new URLSearchParams({
          lat: String(location?.latitude),
          lng: String(location?.longitude),
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
    <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Melbourne CBD</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Distance to Town Hall and indicative trip times.
      </p>

      {state === "idle" ? (
        <p className="mt-4 rounded-lg border border-line bg-surface-subtle px-3 py-2.5 text-sm leading-6 text-ink-soft">
          Search for a location to estimate its CBD commute.
        </p>
      ) : null}

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
          <dl className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-surface-subtle p-3">
              <dt className="text-xs text-ink-muted">Direct distance</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {formatDistance(travel.distanceMeters)}
              </dd>
            </div>
            <div className="rounded-lg bg-surface-subtle p-3">
              <dt className="text-xs text-ink-muted">Indicative drive</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {formatMinutes(travel.driveMinutes)}
              </dd>
            </div>
            <div className="rounded-lg bg-surface-subtle p-3">
              <dt className="text-xs text-ink-muted">
                Indicative transit at 8am
              </dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {formatMinutes(travel.transitMinutes)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-ink-faint">
            Driving assumes free-flow traffic; both times are rounded to the
            nearest 5 minutes. Public transport uses the usual weekday
            timetable at 8:00 am Melbourne time. Actual trips vary.
          </p>
          {travel.driveMinutes !== null || travel.transitMinutes !== null ? (
            <p className="mt-2 text-xs font-normal text-ink-muted">
              {travel.driveMinutes !== null ? (
                <>
                  Driving: Powered by{" "}
                  <a
                    href="https://www.geoapify.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-ink-soft"
                  >
                    Geoapify
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-ink-soft"
                  >
                    &copy; OpenStreetMap contributors
                  </a>
                  .
                </>
              ) : null}{" "}
              {travel.transitMinutes !== null
                ? "Public transport: Google Maps."
                : null}
            </p>
          ) : null}
          {travel.warning ? (
            <p className="mt-2 text-xs leading-5 text-ink-muted">
              {travel.warning}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
