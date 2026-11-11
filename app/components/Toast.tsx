"use client";

import { useEffect } from "react";

export type ToastMessage = {
  message: string;
  action?: { label: string; onClick: () => void };
};

// Single transient status message. The page owns the state; this only
// renders it and asks to be dismissed after a few seconds.
export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(onDismiss, toast.action ? 6000 : 4000);

    return () => window.clearTimeout(timeoutId);
  }, [toast, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:justify-start lg:px-8 print:hidden"
    >
      {toast ? (
        <div className="pointer-events-auto flex items-center gap-3 rounded-lg bg-ink px-4 py-3 text-sm text-page shadow-lg">
          <span>{toast.message}</span>
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className="rounded font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-page"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
