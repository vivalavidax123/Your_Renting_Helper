"use client";

import Link from "next/link";
import { useLoginHref } from "@/app/hooks/useLoginHref";
import { ComparePanel } from "@/app/components/ComparePanel";
import { useExplore } from "@/app/components/ExploreProvider";
import {
  MobilityProfile,
  PresetPicker,
} from "@/app/components/ScoringControls";

export default function ComparePage() {
  const {
    saved,
    savedError,
    savedPending,
    profile,
    preset,
    scoringParams,
    canSave,
    sessionPending,
    locationId,
  } = useExplore();
  const loginHref = useLoginHref();
  const returnHref = locationId
    ? `/locations/${locationId}?${scoringParams}`
    : "/";

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 pb-8 sm:px-6">
      <Link
        href={returnHref}
        className="text-sm font-medium text-accent-ink hover:underline"
      >
        ← Back to {locationId ? "overview" : "search"}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-ink">Compare locations</h1>
      </div>

      {sessionPending || (canSave && savedPending) ? (
        <p role="status" className="text-sm font-medium text-ink-soft">
          Loading saved locations…
        </p>
      ) : canSave ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <MobilityProfile />
            <PresetPicker />
          </div>
          {savedError ? (
            <p
              role="alert"
              className="rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger-ink"
            >
              {savedError}
            </p>
          ) : null}
          <ComparePanel saved={saved} profile={profile} preset={preset} />
        </>
      ) : (
        <section className="rounded-xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">
            Sign in to compare saved locations
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-soft">
            Saving keeps locations tied to your account, which lets this page
            load the correct evidence securely.
          </p>
          <Link
            href={loginHref}
            className="mt-4 inline-block rounded-md bg-action px-4 py-2 text-sm font-semibold text-action-ink hover:bg-action-hover"
          >
            Sign in to compare
          </Link>
        </section>
      )}
    </main>
  );
}
