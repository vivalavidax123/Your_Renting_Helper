"use client";
import Link from "next/link";
import { useExplore } from "@/app/components/ExploreProvider";
import { ComparePanel } from "@/app/components/ComparePanel";
import { MobilityProfile } from "@/app/components/MobilityProfile";
export default function ComparePage() {
  const { saved, profile, canSave, sessionPending, propertyId } = useExplore();
  return <main className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-8 sm:px-6"><Link href={propertyId ? '/locations/' + propertyId + '?profile=' + profile : '/'} className="text-sm text-accent-ink hover:underline">← Back to {propertyId ? 'overview' : 'search'}</Link><h1 className="text-2xl font-bold text-ink">Compare locations</h1>{sessionPending ? <p role="status">Checking sign-in…</p> : canSave ? <><MobilityProfile /><ComparePanel saved={saved} profile={profile} /></> : <section className="rounded-xl border border-line bg-surface p-6"><p className="text-ink-soft">Sign in to save two locations and compare their scores and nearby amenities.</p><Link href="/login" className="mt-4 inline-block text-accent-ink underline">Sign in to compare</Link></section>}</main>;
}
