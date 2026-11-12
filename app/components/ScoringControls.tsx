"use client";
import { useExplore } from "./ExploreProvider";
import {
  weightPresetLabels,
  weightProfileLabels,
  type WeightPreset,
  type WeightProfile,
} from "@/app/lib/categories";

// A row of toggle buttons where exactly one is pressed. Both scoring choices
// live in the URL, so picking one rescores without a new search. On phones
// the row spans the card and each button is as wide as its own label, so four
// options still fit a 360px screen; from sm up the columns are equal.
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
      className="flex gap-0.5 rounded-lg bg-surface-raised p-1 max-sm:w-full sm:inline-grid sm:auto-cols-fr sm:grid-flow-col"
    >
      {(Object.keys(labels) as T[]).map((id) => (
        <button
          type="button"
          key={id}
          disabled={disabled}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={
            "focus-ring whitespace-nowrap rounded-md px-1.5 py-1.5 text-sm transition disabled:opacity-50 max-sm:flex-auto sm:px-3 " +
            (value === id
              ? "bg-surface font-medium text-ink shadow-sm"
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
