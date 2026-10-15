import { buildWalkingIndicators } from "@/app/lib/indicators";
import type { CategoryScore, PlaceGroup } from "@/app/lib/types";
import { MethodNotes } from "./MethodNotes";

export function WalkingCard({
  categoryScores,
  placeGroups,
}: {
  categoryScores: CategoryScore[];
  placeGroups: PlaceGroup[];
}) {
  const [walkability, carReliance] = buildWalkingIndicators(
    categoryScores,
    placeGroups,
  );

  return (
    <div className="h-full rounded-lg border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Walking</h2>
      <p className="mt-3 text-2xl font-semibold text-ink">
        {walkability.value}
      </p>
      <p className="text-xs text-ink-muted">to everyday destinations</p>
      <dl className="mt-3 divide-y divide-line-soft text-sm">
        {walkability.detailItems?.map((item) => (
          <div
            key={item.label}
            className="flex items-baseline justify-between gap-3 py-1.5"
          >
            <dt className="min-w-0 break-words text-ink-soft">{item.label}</dt>
            <dd className="shrink-0 font-medium text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm text-ink-soft">
        <span className="font-semibold text-ink">
          {carReliance.value} car reliance.
        </span>{" "}
        {carReliance.detail}.
      </p>
      <MethodNotes>
        <li>Walk times use straight-line distance at 80 m per minute.</li>
        <li>Real walking routes are usually longer.</li>
      </MethodNotes>
    </div>
  );
}
