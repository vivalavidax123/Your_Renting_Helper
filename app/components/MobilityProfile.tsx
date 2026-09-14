"use client";
import { useExplore } from "./ExploreProvider";
export function MobilityProfile() {
  const { profile, changeProfile, busy } = useExplore();
  return (
    <div
      role="group"
      aria-label="Mobility profile"
      className="grid w-28 grid-cols-2 gap-0.5 rounded-lg bg-surface-raised p-1"
    >
      {(
        [
          { id: "carFree", label: "No car" },
          { id: "carOwner", label: "Car owner" },
        ] as const
      ).map((option) => (
        <button
          type="button"
          key={option.id}
          disabled={busy}
          aria-pressed={profile === option.id}
          onClick={() => changeProfile(option.id)}
          className={
            "min-h-8 min-w-0 whitespace-nowrap rounded-md px-0.5 py-1 text-[10px] disabled:opacity-50 " +
            (profile === option.id
              ? "bg-surface font-semibold text-ink shadow-sm"
              : "text-ink-muted hover:text-ink")
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
