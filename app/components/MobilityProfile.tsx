"use client";
import { useExplore } from "./ExploreProvider";
export function MobilityProfile({ showDescription = true }: { showDescription?: boolean }) {
  const { profile, changeProfile, busy } = useExplore();
  return <div role="group" aria-label="Mobility profile" className="flex w-fit gap-1 rounded-lg bg-surface-raised p-1">
    {([{ id: "carFree", label: "No car" }, { id: "carOwner", label: "Car owner" }] as const).map(option => <button type="button" key={option.id} disabled={busy} aria-pressed={profile === option.id} onClick={() => changeProfile(option.id)} className={"rounded-md px-3 py-2 text-xs disabled:opacity-50 " + (profile === option.id ? "bg-surface font-semibold text-ink shadow-sm" : "text-ink-muted hover:text-ink")}>{option.label}</button>)}
  </div>{showDescription ? <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs leading-5 text-ink-muted"><li>Car owner is more tolerant of distance.</li><li>Category priorities stay the same.</li></ul> : null}</div>;
}
