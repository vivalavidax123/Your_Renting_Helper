"use client";

import { useState, type ReactNode } from "react";
import type { GeocodeLocation } from "@/app/lib/types";
import { CbdTravelCard } from "./CbdTravelCard";
import { RentalInsights } from "./RentalInsights";
import { TerrainCard } from "./TerrainCard";
import { ChevronDownIcon } from "./icons";

// Commute and terrain call paid provider APIs on every request, so a card
// only mounts (and fetches) once the visitor asks for it.
function OnDemandCard({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return children;
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="focus-ring flex w-full items-center gap-3 rounded-lg bg-surface-subtle px-3 py-3 text-left transition hover:bg-hover"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs text-ink-muted">{summary}</span>
      </span>
      <span className="shrink-0 text-xs font-medium text-accent">Show</span>
      <ChevronDownIcon className="size-4 shrink-0 text-ink-faint" />
    </button>
  );
}

export function MoreEvidence({
  location,
  canContribute,
}: {
  location: GeocodeLocation;
  canContribute: boolean;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5 print:hidden">
      <h2 className="text-base font-semibold text-ink">
        More about this location
      </h2>
      <p className="mt-0.5 text-xs text-ink-muted">
        Extra evidence that does not change the score. Each one loads when you
        open it.
      </p>
      <div className="mt-3 space-y-3">
        <OnDemandCard
          title="Commute to Melbourne CBD"
          summary="Driving and weekday 8am public-transport time"
        >
          <CbdTravelCard location={location} />
        </OnDemandCard>
        <OnDemandCard
          title="Community rent"
          summary="Weekly rents reported by other renters nearby"
        >
          <RentalInsights location={location} canContribute={canContribute} />
        </OnDemandCard>
        <OnDemandCard
          title="Terrain"
          summary="How hilly the land is within 1.5 km"
        >
          <TerrainCard location={location} />
        </OnDemandCard>
      </div>
    </section>
  );
}
