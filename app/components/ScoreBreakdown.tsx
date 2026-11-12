"use client";

import { useState } from "react";
import Link from "next/link";
import { categoryColor } from "@/app/lib/categories";
import type { CategoryScore, PlaceGroup, RequestState } from "@/app/lib/types";
import { formatDistance, scoreBand, scoreBandClasses } from "@/app/lib/utils";
import { CategoryTile, ChevronDownIcon } from "./icons";

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

function closestPlace(group: PlaceGroup | undefined) {
  if (!group || group.places.length === 0) {
    return null;
  }

  return group.places.reduce((closest, place) =>
    place.distanceMeters < closest.distanceMeters ? place : closest,
  );
}

function CategoryRow({
  category,
  group,
  open,
  onToggle,
  onSelectPlace,
  onShowCategory,
}: {
  category: CategoryScore;
  group: PlaceGroup | undefined;
  open: boolean;
  onToggle: () => void;
  onSelectPlace: (placeId: string) => void;
  onShowCategory: (categoryId: string) => void;
}) {
  const excluded = category.weight === 0;
  const bandClasses = scoreBandClasses[scoreBand(category.score).band];
  const closest = closestPlace(group);
  const detailId = `category-detail-${category.id}`;
  const pillars = category.pillars;

  return (
    <li className={excluded ? "opacity-50" : ""}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailId}
          onClick={onToggle}
          className="focus-ring grid w-full grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-1 py-2.5 text-left hover:bg-hover sm:grid-cols-[auto_minmax(0,11rem)_minmax(0,1fr)_auto_auto]"
        >
          <CategoryTile
            categoryId={category.id}
            color={categoryColor(category.id)}
          />
          <span className="min-w-0">
            <span className="flex items-baseline gap-1.5">
              <span className="truncate text-sm font-semibold text-ink">
                {category.label}
              </span>
              {excluded ? null : (
                <span className="shrink-0 text-[11px] text-ink-muted">
                  {category.weight}%
                </span>
              )}
            </span>
            <span className="block truncate text-xs text-ink-muted">
              {excluded
                ? "Not counted in the overall score"
                : `${category.count} nearby · ${
                    category.closestDistanceMeters === null
                      ? "no match"
                      : formatDistance(category.closestDistanceMeters)
                  }`}
            </span>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-score-track max-sm:col-start-2 max-sm:col-end-5 max-sm:row-start-2">
            <span
              className={`block h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500 ${excluded ? "bg-ink-faint" : bandClasses.bg}`}
              style={{ width: `${category.score}%` }}
            />
          </span>
          <span
            className={`w-8 text-right text-base font-semibold tabular-nums ${excluded ? "text-ink-soft" : bandClasses.text}`}
          >
            {category.score}
          </span>
          <ChevronDownIcon
            className={`size-4 text-ink-faint motion-safe:transition-transform print:hidden ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h3>

      {/* Animating grid rows from 0fr to 1fr expands to the content height
          without measuring it in JavaScript. */}
      <div
        id={detailId}
        inert={!open}
        className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 print:grid-rows-[1fr] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="mb-2 ml-11 rounded-lg bg-surface-subtle px-3 py-3 text-xs leading-5 text-ink-soft">
            {pillars ? (
              <>
                <div className="flex h-2.5 max-w-md gap-0.5 overflow-hidden rounded-full">
                  {pillarParts.map((part) => (
                    <span
                      key={part.key}
                      className="bg-score-track"
                      style={{ width: `${part.max}%` }}
                    >
                      <span
                        className={`block h-full ${bandClasses.bg} ${part.shade}`}
                        style={{
                          width: `${(pillars[part.key] / part.max) * 100}%`,
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
        </div>
      </div>
    </li>
  );
}

function SkeletonRows() {
  return (
    <ul aria-hidden="true" className="divide-y divide-line-soft">
      {Array.from({ length: 8 }, (_, index) => (
        <li
          key={index}
          className="flex items-center gap-3 px-1 py-2.5 motion-safe:animate-pulse"
        >
          <span className="size-8 rounded-lg bg-surface-raised" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-28 rounded bg-surface-raised" />
            <span className="block h-2.5 w-40 rounded bg-surface-raised" />
          </span>
          <span className="h-4 w-8 rounded bg-surface-raised" />
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
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  if (placesState === "idle" || placesState === "error") {
    return null;
  }

  function toggle(categoryId: string) {
    setOpenIds((current) => {
      const next = new Set(current);

      if (!next.delete(categoryId)) {
        next.add(categoryId);
      }

      return next;
    });
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
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
          <SkeletonRows />
        </>
      ) : null}

      {placesState === "success" ? (
        <ul className="divide-y divide-line-soft">
          {/* Sorted by weight so switching priorities visibly reorders the
              rows; zero-weight categories dim and sink to the bottom. */}
          {[...categoryScores]
            .sort((a, b) => b.weight - a.weight)
            .map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                group={placeGroups.find((group) => group.id === category.id)}
                open={openIds.has(category.id)}
                onToggle={() => toggle(category.id)}
                onSelectPlace={onSelectPlace}
                onShowCategory={onShowCategory}
              />
            ))}
        </ul>
      ) : null}
    </section>
  );
}
