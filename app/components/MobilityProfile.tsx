"use client";
import { useExplore } from "./ExploreProvider";
export function MobilityProfile() {
  const { profile, changeProfile, busy } = useExplore();
  return <div><div role="group" aria-label="Mobility profile" className="flex w-fit gap-1 rounded-lg bg-surface-raised p-1">
    {([{ id: "carFree", label: "No car" }, { id: "carOwner", label: "Car owner" }] as const).map(option => <button type="button" key={option.id} disabled={busy} aria-pressed={profile === option.id} onClick={() => changeProfile(option.id)} className={"rounded-md px-3 py-2 text-xs disabled:opacity-50 " + (profile === option.id ? "bg-surface font-semibold text-ink shadow-sm" : "text-ink-muted hover:text-ink")}>{option.label}</button>)}
  </div><p className="mt-1.5 text-xs leading-5 text-ink-muted">Car owner is more tolerant of distance. Category priorities stay the same.</p></div>;
}
