"use client";
import Link from "next/link";
import { useExplore } from "./ExploreProvider";
import { MobilityProfile } from "./MobilityProfile";
export function ResultHeading({ title }: { title?: string }) {
  const { location, propertyId, profile, overallScore, fetchedAt, resultFromCache, busy, canSave, saved, toggleSaved, savedError } = useExplore();
  if (!location) return null;
  const favourite = saved.find(item => item.id === propertyId);
  const profileLabel = profile === "carOwner" ? "Car owner" : "No car";
  return <div className="space-y-4">
    {title ? <Link href={'/locations/' + propertyId + '?profile=' + profile} className="text-sm text-accent-ink hover:underline">← Back to overview</Link> : null}
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1">
      <h1 className="break-words text-2xl font-bold tracking-tight text-ink">{title ?? location.formattedAddress}</h1>
      <p className="mt-1 text-sm text-ink-muted"></p>
    </div>{!title ? <div className="rounded-lg border border-accent-line bg-accent-soft px-4 py-2 text-center"><span className="text-3xl font-bold text-accent-ink">{overallScore}</span><span className="text-xs text-accent-ink"> /100</span><p className="text-xs text-accent-ink">Overall score</p></div> : null}</div>
    <div className="flex flex-wrap items-start justify-between gap-3">{title ? <p className="rounded-md bg-surface-raised px-3 py-2 text-xs text-ink-muted">Profile: <span className="font-semibold text-ink">{profileLabel}</span></p> : <MobilityProfile />}{propertyId ? canSave ? <button disabled={busy} className="rounded-lg border border-line px-3 py-2 text-sm text-ink-soft hover:bg-hover disabled:opacity-50" onClick={() => void toggleSaved(favourite ?? { ...location, id: propertyId, lastSearchedAt: fetchedAt ?? '', savedAt: null, overallScore })}>{favourite ? '★ Saved · remove' : '☆ Save location'}</button> : <Link className="text-sm text-accent-ink underline" href="/login">Sign in to save</Link> : null}</div>
    {savedError ? <p role="alert" className="text-sm text-danger-ink">{savedError}</p> : null}
    <ul className="list-disc space-y-0.5 pl-4 text-xs leading-5 text-ink-muted">
      {fetchedAt ? <li>{resultFromCache ? 'Saved evidence' : 'Evidence collected'}: {new Date(fetchedAt).toLocaleDateString('en-AU', { timeZone: 'UTC' })}</li> : null}
      <li>A convenience indicator, not a rating of rental quality.</li>
      <li>Distances are direct estimates.</li>
    </ul>
  </div>;
}
