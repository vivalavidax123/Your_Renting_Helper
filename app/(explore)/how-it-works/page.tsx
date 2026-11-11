import type { Metadata } from "next";
import Link from "next/link";
import {
  proximityHalfLifeFactor,
  rentScoreCategories,
  weightPresetLabels,
  weightPresets,
  weightProfileLabels,
  type WeightPreset,
} from "@/app/lib/categories";
import { formatRadius } from "@/app/lib/utils";

export const metadata: Metadata = {
  title: "How it works · Your Renting Helper",
  description:
    "How Your Renting Helper scores a rental location, and what the score does not cover.",
};

const sections = [
  { id: "score", title: "What the score means" },
  { id: "parts", title: "The three parts of a category score" },
  { id: "mobility", title: "No car or car owner" },
  { id: "priorities", title: "Score priorities" },
  { id: "limits", title: "What is not included" },
  { id: "data", title: "Data sources" },
];

// Plain-language versions of the three pillars in app/lib/scoring.ts.
const pillars = [
  {
    name: "Proximity",
    points: 50,
    text: "Full points when the closest place is within 400 m. Beyond that the points halve over a set distance, which is shorter without a car and longer for wide-area categories such as shopping centres.",
  },
  {
    name: "Variety",
    points: 30,
    text: "More places nearby earn more points, with diminishing returns: the second supermarket matters much more than the tenth. Cafes and gyms keep adding value for longer.",
  },
  {
    name: "Quality",
    points: 20,
    text: "The three best-rated places are compared with what is typical for that kind of place, so a category with harsh reviewers (banks) is not punished against one with generous reviewers (gyms).",
  },
];

const presets = Object.keys(weightPresets) as WeightPreset[];

const headingClass = "scroll-mt-20 text-lg font-semibold text-ink";

export default function HowItWorksPage() {
  return (
    <main className="flex-1 px-4 pb-10 sm:px-6">
      <article className="mx-auto max-w-3xl space-y-8 text-sm leading-7 text-ink-soft">
        <header>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">
            How the score works
          </h1>
          <p className="mt-2">
            Your Renting Helper looks at what is around an address and turns it
            into a score out of 100. This page explains where that number comes
            from, in plain language.
          </p>
          <nav aria-label="On this page" className="mt-4">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-accent">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="focus-ring rounded underline underline-offset-2 hover:text-accent-hover"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <section className="space-y-2">
          <h2 id="score" className={headingClass}>
            What the score means
          </h2>
          <p>
            The overall score summarises everyday convenience: how close, how
            plentiful and how well reviewed the nearby shops, transport, health
            services and other amenities are. It is a compact summary, not a
            rating of the property itself. The category pages and the map carry
            the detail.
          </p>
          <p>
            Scores of 80 and above read as Excellent, 70 to 79 as Good, 50 to 69
            as Fair, and below 50 as Limited.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="parts" className={headingClass}>
            The three parts of a category score
          </h2>
          <p>
            Each of the eight categories is scored out of 100 from three parts:
          </p>
          <div
            aria-hidden="true"
            className="flex h-3 max-w-md gap-0.5 overflow-hidden rounded-full"
          >
            <span className="w-1/2 bg-score-high" />
            <span className="w-[30%] bg-score-high opacity-70" />
            <span className="w-1/5 bg-score-high opacity-45" />
          </div>
          <dl className="space-y-3">
            {pillars.map((pillar) => (
              <div key={pillar.name}>
                <dt className="font-semibold text-ink">
                  {pillar.name} · up to {pillar.points} points
                </dt>
                <dd>{pillar.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-2">
          <h2 id="mobility" className={headingClass}>
            No car or car owner
          </h2>
          <p>
            The mobility choice changes how much distance costs, so it changes
            the category scores themselves. Past the 400 m walkable ring, the
            proximity points halve every {proximityHalfLifeFactor.carFree * 100}
            % of a category&apos;s search radius for{" "}
            {weightProfileLabels.carFree}, and every{" "}
            {proximityHalfLifeFactor.carOwner * 100}% for{" "}
            {weightProfileLabels.carOwner}.
          </p>
        </section>

        <section className="space-y-3">
          <h2 id="priorities" className={headingClass}>
            Score priorities
          </h2>
          <p>
            The overall score is a weighted average of the category scores. The
            priority you pick only changes these weights, never a
            category&apos;s own score. Each column adds up to 100. Fuel &amp;
            Automotive is shown as useful context but is never counted.
          </p>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line-strong text-xs text-ink-muted">
                  <th className="px-3 py-2 font-semibold">Category</th>
                  <th className="px-3 py-2 font-semibold">Radius</th>
                  {presets.map((preset) => (
                    <th
                      key={preset}
                      className="px-3 py-2 text-right font-semibold"
                    >
                      {weightPresetLabels[preset]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rentScoreCategories.map((category) => (
                  <tr key={category.id} className="border-b border-line-soft">
                    <th scope="row" className="px-3 py-2 font-medium text-ink">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.label}
                      </span>
                    </th>
                    <td className="whitespace-nowrap px-3 py-2">
                      {formatRadius(category.radiusMeters)}
                    </td>
                    {presets.map((preset) => (
                      <td
                        key={preset}
                        className="px-3 py-2 text-right tabular-nums"
                      >
                        {weightPresets[preset][category.id]}%
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-2">
          <h2 id="limits" className={headingClass}>
            What is not included
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Distances are straight-line estimates, not walking or driving
              routes. Walk times assume 80 metres per minute in a straight line.
            </li>
            <li>
              Places with fewer than 30 reviews are left out (bus stops and
              stations excepted), so a brand-new shop may be missing.
            </li>
            <li>
              Results are reused for up to seven days, so a very recent opening
              or closure may not show yet.
            </li>
            <li>
              Commute, rent and terrain appear on the details page but are not
              part of the score.
            </li>
          </ul>
          <p>
            Scores are indicative only and do not guarantee rental quality,
            safety, affordability or suitability.
          </p>
        </section>

        <section className="space-y-2">
          <h2 id="data" className={headingClass}>
            Data sources
          </h2>
          <p>
            Addresses, places, ratings and the map come from Google Maps
            Platform. Where available, bus stops and upcoming departures come
            from Transitland.
          </p>
        </section>

        <p>
          <Link
            href="/"
            className="focus-ring rounded font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            ← Back to search
          </Link>
        </p>
      </article>
    </main>
  );
}
