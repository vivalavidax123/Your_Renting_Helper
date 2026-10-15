import type { ReactNode } from "react";

// Collapsed "how this is measured" notes shared by the details-page cards, so
// each card leads with its answer instead of a block of footnotes.
export function MethodNotes({ children }: { children: ReactNode }) {
  return (
    <details className="mt-3 text-xs leading-5 text-ink-muted">
      <summary className="cursor-pointer">How this is measured</summary>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">{children}</ul>
    </details>
  );
}
