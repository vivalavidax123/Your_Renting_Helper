"use client";
import { useExplore } from "./ExploreProvider";
import { weightPresetLabels, type WeightPreset } from "@/app/lib/categories";
// Same segmented-button pattern as MobilityProfile: the choice lives in the
// URL, so the score updates without a new search.
export function PresetPicker() {
  const { preset, changePreset, busy } = useExplore();
  return (
    <div
      role="group"
      aria-label="Score priorities"
      className="inline-grid grid-cols-4 gap-0.5 rounded-lg bg-surface-raised p-1"
    >
      {(Object.keys(weightPresetLabels) as WeightPreset[]).map((id) => (
        <button
          type="button"
          key={id}
          disabled={busy}
          aria-pressed={preset === id}
          onClick={() => changePreset(id)}
          className={
            "min-h-8 whitespace-nowrap rounded-md px-2 py-1 text-xs disabled:opacity-50 " +
            (preset === id
              ? "bg-surface font-semibold text-ink shadow-sm"
              : "text-ink-muted hover:text-ink")
          }
        >
          {weightPresetLabels[id]}
        </button>
      ))}
    </div>
  );
}
