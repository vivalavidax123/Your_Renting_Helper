"use client";

import { useEffect, useState } from "react";
import { isJsonRecord, readApiResult } from "@/app/lib/api";
import { steepGradePercent } from "@/app/lib/terrain";
import type {
  GeocodeLocation,
  RequestState,
  TerrainLevel,
  TerrainSummary,
} from "@/app/lib/types";
import { formatRadius } from "@/app/lib/utils";
import { MethodNotes } from "./MethodNotes";

const levelText: Record<TerrainLevel, { label: string; detail: string }> = {
  flat: {
    label: "Flat",
    detail: "Little climbing in any direction.",
  },
  gentle: {
    label: "Gently undulating",
    detail: "Some slopes, mostly easy for any car, bike, or walk.",
  },
  hilly: {
    label: "Hilly",
    detail:
      "Regular climbs; a low-powered car or a loaded bike will notice them.",
  },
  steep: {
    label: "Steep",
    detail:
      "Frequent steep climbs and descents in most directions; expect daily hill driving.",
  },
};

function isTerrainPayload(value: Record<string, unknown>) {
  const terrain = value.terrain;

  return (
    isJsonRecord(terrain) &&
    typeof terrain.level === "string" &&
    terrain.level in levelText &&
    typeof terrain.radiusMeters === "number" &&
    typeof terrain.elevationRangeMeters === "number" &&
    typeof terrain.averageGradePercent === "number" &&
    typeof terrain.steepestGradePercent === "number" &&
    typeof terrain.steepShare === "number"
  );
}

export function TerrainCard({
  location,
}: {
  location: GeocodeLocation | null;
}) {
  const [state, setState] = useState<RequestState>("idle");
  const [terrain, setTerrain] = useState<TerrainSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!location) {
      return;
    }

    const controller = new AbortController();

    async function loadTerrain() {
      setState("loading");
      setError("");

      try {
        const query = new URLSearchParams({
          lat: String(location?.latitude),
          lng: String(location?.longitude),
        });
        const response = await fetch(`/api/terrain?${query}`, {
          signal: controller.signal,
        });
        const data = await readApiResult<{ terrain: TerrainSummary }>(
          response,
          isTerrainPayload,
        );

        if (controller.signal.aborted) return;

        if (!response.ok || !data.ok) {
          setState("error");
          setError(data.ok ? "Terrain data is unavailable." : data.error);
          return;
        }

        setTerrain(data.terrain);
        setState("success");
      } catch {
        if (!controller.signal.aborted) {
          setState("error");
          setError("Terrain data is unavailable.");
        }
      }
    }

    void loadTerrain();
    return () => controller.abort();
  }, [location]);

  return (
    <div className="h-full rounded-lg border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Terrain</h2>

      {state === "idle" ? (
        <p className="mt-4 rounded-lg border border-line bg-surface-subtle px-3 py-2.5 text-sm leading-6 text-ink-soft">
          Search for a location to measure its terrain.
        </p>
      ) : null}

      {state === "loading" ? (
        <p className="mt-4 text-sm font-medium text-ink-soft">
          Measuring terrain…
        </p>
      ) : null}

      {state === "error" ? (
        <p className="mt-4 rounded-lg border border-danger-line bg-danger-soft px-3 py-2.5 text-sm text-danger-ink">
          {error}
        </p>
      ) : null}

      {state === "success" && terrain ? (
        <>
          <p className="mt-3 text-2xl font-semibold text-ink">
            {levelText[terrain.level].label}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {levelText[terrain.level].detail}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-surface-subtle p-3">
              <dt className="text-xs text-ink-muted">Average slope</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {terrain.averageGradePercent}%
              </dd>
            </div>
            <div className="rounded-lg bg-surface-subtle p-3">
              <dt className="text-xs text-ink-muted">Steepest stretch</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">
                {terrain.steepestGradePercent}%
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            Data: Google Maps elevation.
          </p>
          <MethodNotes>
            <li>
              {Math.round(terrain.steepShare * 100)}% of stretches are{" "}
              {steepGradePercent}% or steeper; the height range is{" "}
              {terrain.elevationRangeMeters} m.
            </li>
            <li>
              Sampled every 150 m along eight straight lines out to{" "}
              {formatRadius(terrain.radiusMeters)}.
            </li>
            <li>
              Lines do not follow streets, so a specific road can be steeper or
              gentler.
            </li>
          </MethodNotes>
        </>
      ) : null}
    </div>
  );
}
