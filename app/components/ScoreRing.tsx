import { scoreBand, scoreBandClasses } from "@/app/lib/utils";

const radius = 52;
const circumference = 2 * Math.PI * radius;

// Progress ring for a 0-100 score. A null score renders the empty track
// (before the first search) or a rotating segment while loading.
export function ScoreRing({
  score,
  loading = false,
  className = "size-28",
  name = "Overall score",
}: {
  score: number | null;
  loading?: boolean;
  className?: string;
  // What the number is, for screen readers ("Overall score", "Groceries").
  name?: string;
}) {
  const band = score === null ? null : scoreBand(score);
  const label = loading
    ? "Calculating score"
    : score === null || band === null
      ? "No score yet"
      : `${name} ${score} out of 100, ${band.label}`;

  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label={label}
      className={`shrink-0 ${className}`}
    >
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        strokeWidth="10"
        className="stroke-score-track"
      />
      {loading ? (
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.25} ${circumference}`}
          className="origin-center stroke-accent motion-safe:animate-spin"
        />
      ) : score !== null && band !== null ? (
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          transform="rotate(-90 60 60)"
          className={`${scoreBandClasses[band.band].stroke} motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out`}
        />
      ) : null}
      <text
        x="60"
        y="64"
        textAnchor="middle"
        className="fill-ink text-[34px] font-bold tabular-nums"
      >
        {loading ? "…" : (score ?? "--")}
      </text>
      <text
        x="60"
        y="84"
        textAnchor="middle"
        className="fill-ink-muted text-xs"
      >
        /100
      </text>
    </svg>
  );
}
