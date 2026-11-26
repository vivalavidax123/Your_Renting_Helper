"use client";

import { useState } from "react";
import Link from "next/link";
import { categoryColor } from "@/app/lib/categories";
import type { CategoryScore, PlaceGroup, RequestState } from "@/app/lib/types";
import { formatDistance } from "@/app/lib/utils";
import { CategoryTile } from "./icons";

type ScoreBreakdownProps = {
  placesState: RequestState;
  categoryScores: CategoryScore[];
  placeGroups: PlaceGroup[];
  onSelectPlace: (placeId: string) => void;
  onShowCategory: (categoryId: string) => void;
};

const pillarParts = [
  { key: "proximity", label: "Proximity", max: 50, shade: "" },
  { key: "variety", label: "Variety", max: 30, shade: "opacity-70" },
  { key: "quality", label: "Quality", max: 20, shade: "opacity-45" },
] as const;

const detailPanelId = "category-detail-panel";

// Two columns on phones and in the narrower lg split view, four once the
// left column is wide enough (xl gives it 800px).
const gridClass =
  "grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4";

function closestPlace(group: PlaceGroup | undefined) {
  if (!group || group.places.length === 0) {
    return null;
  }

  return group.places.reduce((closest, place) =>
    place.distanceMeters < closest.distanceMeters ? place : closest,
  );
}

function CategoryCard({
  category,
  selected,
  onSelect,
}: {
  category: CategoryScore;
  selected: boolean;
  onSelect: () => void;
}) {
  const excluded = category.weight === 0;
  const color = excluded ? "#94a3b8" : categoryColor(category.id);

  return (
    <li className={excluded ? "opacity-55" : ""}>
      <button
        type="button"
        aria-expanded={selected}
        aria-controls={detailPanelId}
        onClick={onSelect}
        // The top border carries the category colour; the selected card also
        // gets a ring in the same colour so it reads as the open one.
        className="focus-ring flex h-full w-full flex-col rounded-lg border border-t-[3px] border-line bg-surface-subtle p-3 text-left transition hover:bg-hover"
        style={{
          borderTopColor: color,
          boxShadow: selected ? `0 0 0 2px ${color}` : undefined,
        }}
      >
        <span className="flex items-center gap-2">
          <CategoryTile
            categoryId={category.id}
            color={categoryColor(category.id)}
          />
          <span className="min-w-0 text-xs font-medium leading-tight text-ink-soft">
            {category.label}
          </span>
        </span>
        <span className="mt-2.5 text-2xl font-semibold tabular-nums text-ink">
          {category.score}
          <span className="text-xs font-normal text-ink-muted"> /100</span>
        </span>
        <span
          aria-hidden="true"
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-score-track"
        >
          <span
            className="block h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500"
            style={{ width: `${category.score}%`, backgroundColor: color }}
          />
        </span>
        <span className="mt-2 text-xs text-ink-muted">
          {category.count} nearby ·{" "}
          {category.closestDistanceMeters === null
            ? "no match"
            : formatDistance(category.closestDistanceMeters)}
        </span>
        <span className="mt-0.5 text-[11px] text-ink-muted">
          {excluded
            ? "Not counted in overall"
            : `${category.weight}% of overall`}
        </span>
      </button>
    </li>
  );
}

function CategoryDetail({
  category,
  group,
  onSelectPlace,
  onShowCategory,
}: {
  category: CategoryScore;
  group: PlaceGroup | undefined;
  onSelectPlace: (placeId: string) => void;
  onShowCategory: (categoryId: string) => void;
}) {
  const color = categoryColor(category.id);
  const closest = closestPlace(group);
  const pillars = category.pillars;

  return (
    <div
      className="rounded-lg border-l-[3px] bg-surface-subtle px-3 py-3 text-xs leading-5 text-ink-soft"
      style={{ borderLeftColor: color }}
    >
      <p className="text-sm font-semibold text-ink">
        {category.label}{" "}
        <span className="font-normal tabular-nums text-ink-muted">
          {category.score}/100
        </span>
      </p>
      {pillars ? (
        <>
          <div className="mt-2 flex h-2.5 max-w-md gap-0.5 overflow-hidden rounded-full">
            {pillarParts.map((part) => (
              <span
                key={part.key}
                className="bg-score-track"
                style={{ width: `${part.max}%` }}
              >
                <span
                  className={`block h-full ${part.shade}`}
                  style={{
                    width: `${(pillars[part.key] / part.max) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </span>
            ))}
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-4 tabular-nums">
            {pillarParts.map((part) => (
              <span key={part.key}>
                {part.label} {pillars[part.key]}/{part.max}
              </span>
            ))}
          </p>
        </>
      ) : null}
      <p className="mt-2">{category.explanation}</p>
      {closest ? (
        <p className="mt-1 print:hidden">
          Closest:{" "}
          <button
            type="button"
            onClick={() => onSelectPlace(closest.id)}
            className="focus-ring rounded font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            {closest.name}, {formatDistance(closest.distanceMeters)}
          </button>
          {" · "}
          <button
            type="button"
            onClick={() => onShowCategory(category.id)}
            className="focus-ring rounded font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            Show these on the map
          </button>
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-ink-muted">
        Distances are straight-line estimates.{" "}
        <Link
          href="/how-it-works"
          className="underline underline-offset-2 hover:text-ink print:hidden"
        >
          How scoring works
        </Link>
      </p>
    </div>
  );
}

function SkeletonCards() {
  return (
    <ul aria-hidden="true" className={gridClass}>
      {Array.from({ length: 8 }, (_, index) => (
        <li
          key={index}
          className="space-y-2.5 rounded-lg border border-line bg-surface-subtle p-3 motion-safe:animate-pulse"
        >
          <span className="flex items-center gap-2">
            <span className="size-8 rounded-lg bg-surface-raised" />
            <span className="h-3 w-16 rounded bg-surface-raised" />
          </span>
          <span className="block h-6 w-12 rounded bg-surface-raised" />
          <span className="block h-1.5 rounded bg-surface-raised" />
          <span className="block h-2.5 w-20 rounded bg-surface-raised" />
        </li>
      ))}
    </ul>
  );
}

export function ScoreBreakdown({
  placesState,
  categoryScores,
  placeGroups,
  onSelectPlace,
  onShowCategory,
}: ScoreBreakdownProps) {
  // One open category at a time. The id stays set while the panel closes so
  // its content does not vanish mid-animation.
  const [detail, setDetail] = useState<{ id: string; open: boolean } | null>(
    null,
  );

  if (placesState === "idle" || placesState === "error") {
    return null;
  }

  // Sorted by weight so switching priorities visibly reorders the cards;
  // zero-weight categories dim and sink to the bottom.
  const sorted = [...categoryScores].sort((a, b) => b.weight - a.weight);
  const shown = detail
    ? sorted.find((category) => category.id === detail.id)
    : undefined;
  const open = Boolean(detail?.open && shown);

  function select(categoryId: string) {
    setDetail((current) =>
      current?.id === categoryId && current.open
        ? { id: categoryId, open: false }
        : { id: categoryId, open: true },
    );
  }

  function groupFor(categoryId: string) {
    return placeGroups.find((group) => group.id === categoryId);
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Category scores</h2>
        {placesState === "success" ? (
          <span className="text-xs text-ink-muted">Sorted by weight</span>
        ) : null}
      </div>

      {placesState === "loading" ? (
        <>
          <p className="sr-only" role="status">
            Loading nearby amenities and calculating scores
          </p>
          <SkeletonCards />
        </>
      ) : null}

      {placesState === "success" ? (
        <>
          <ul className={gridClass}>
            {sorted.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                selected={open && detail?.id === category.id}
                onSelect={() => select(category.id)}
              />
            ))}
          </ul>

          {/* Animating grid rows from 0fr to 1fr expands to the content
              height without measuring it in JavaScript. */}
          <div
            id={detailPanelId}
            inert={!open}
            className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 print:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
            <div className="overflow-hidden">
              {shown ? (
                <div className="pt-3">
                  <CategoryDetail
                    category={shown}
                    group={groupFor(shown.id)}
                    onSelectPlace={onSelectPlace}
                    onShowCategory={onShowCategory}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* A printed page cannot be tapped, so print every category's
              details under the cards instead. */}
          <div className="hidden space-y-2 pt-3 print:block">
            {sorted.map((category) => (
              <CategoryDetail
                key={category.id}
                category={category}
                group={groupFor(category.id)}
                onSelectPlace={onSelectPlace}
                onShowCategory={onShowCategory}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
