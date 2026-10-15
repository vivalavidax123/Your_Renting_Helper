"use client";
import { useExplore } from "./ExploreProvider";
import {
  weightPresetLabels,
  weightProfileLabels,
  type WeightPreset,
  type WeightProfile,
} from "@/app/lib/categories";

// A row of toggle buttons where exactly one is pressed. Both scoring choices
// live in the URL, so picking one rescores without a new search.
function SegmentedControl<T extends string>({
  label,
  labels,
  value,
  disabled,
  onChange,
}: {
  label: string;
  labels: Record<T, string>;
  value: T;
  disabled: boolean;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-grid auto-cols-fr grid-flow-col gap-0.5 rounded-lg bg-surface-raised p-1"
    >
      {(Object.keys(labels) as T[]).map((id) => (
        <button
          type="button"
          key={id}
          disabled={disabled}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={
            "min-h-8 whitespace-nowrap rounded-md px-2 py-1 text-xs disabled:opacity-50 " +
            (value === id
              ? "bg-surface font-semibold text-ink shadow-sm"
              : "text-ink-muted hover:text-ink")
          }
        >
          {labels[id]}
        </button>
      ))}
    </div>
  );
}

export function MobilityProfile() {
  const { profile, changeProfile, busy } = useExplore();
  return (
    <SegmentedControl<WeightProfile>
      label="Mobility profile"
      labels={weightProfileLabels}
      value={profile}
      disabled={busy}
      onChange={changeProfile}
    />
  );
}

export function PresetPicker() {
  const { preset, changePreset, busy } = useExplore();
  return (
    <SegmentedControl<WeightPreset>
      label="Score priorities"
      labels={weightPresetLabels}
      value={preset}
      disabled={busy}
      onChange={changePreset}
    />
  );
}
