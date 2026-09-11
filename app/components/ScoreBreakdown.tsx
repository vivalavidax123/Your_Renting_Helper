import Link from "next/link";
import type { CategoryScore } from "../lib/types";
import type { WeightProfile } from "../lib/categories";
import { formatDistance } from "../lib/utils";
export function ScoreBreakdown({ categoryScores, propertyId, profile }: { categoryScores: CategoryScore[]; propertyId: string | null; profile: WeightProfile }) {
  return <section className="mt-5"><h2 className="text-base font-semibold text-ink">Category scores</h2><p className="mt-1 text-xs text-ink-muted">Open a category to see the places and evidence behind its score.</p>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[...categoryScores].sort((a, b) => b.weight - a.weight).map(category => {
      const content = <><div className="flex items-center gap-1.5"><span className={'size-2 shrink-0 rounded-full ' + category.colorClass} /><h3 className="text-xs font-medium text-ink-soft">{category.label}</h3></div><p className="mt-2 text-2xl font-semibold text-ink">{category.score}<span className="text-xs font-normal text-ink-muted"> /100</span></p><p className="mt-1 text-xs text-ink-muted">{category.count} nearby · {category.closestDistanceMeters === null ? 'No match' : formatDistance(category.closestDistanceMeters)}</p><p className="mt-1 text-[11px] text-ink-muted">{category.weight ? category.weight + '% of overall' : 'Not counted in overall'}</p></>;
      return propertyId ? <Link key={category.id} href={'/locations/' + propertyId + '/categories/' + category.id + '?profile=' + profile} aria-label={category.label + ', ' + category.score + ' out of 100, view details'} className="rounded-lg border border-line bg-surface-subtle p-3 transition hover:border-accent hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{content}</Link> : <article key={category.id} className="rounded-lg border border-line bg-surface-subtle p-3">{content}</article>;
    })}</div>
  </section>;
}
