// Class names shared by the account pages, so their fields and buttons stay
// identical without a component for each.
export const inputClass =
  "w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent disabled:text-ink-faint";

export const primaryButtonClass =
  "w-full rounded-md bg-action py-2 text-sm font-semibold text-action-ink transition hover:bg-action-hover disabled:bg-action-disabled";

// A link styled as the primary button, for "go to the next step" actions.
export const primaryLinkClass =
  "mt-5 inline-flex justify-center " + primaryButtonClass;
