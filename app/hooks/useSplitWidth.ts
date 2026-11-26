"use client";

import { useCallback, useSyncExternalStore } from "react";

const storageKey = "split-card-width";

// Components using the hook re-read the width when it changes here or in
// another tab (the "storage" event).
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function storedWidth() {
  try {
    const value = Number(window.localStorage.getItem(storageKey));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    // Private windows or blocked storage: use the default layout.
    return null;
  }
}

// The width (in pixels) the visitor dragged the card column to, or null for
// the default layout. It is remembered in this browser only (localStorage).
// useSyncExternalStore reads it from the browser after hydration; the server
// has no localStorage, so it always renders the default layout.
export function useSplitWidth() {
  const width = useSyncExternalStore(subscribe, storedWidth, () => null);

  const saveWidth = useCallback((next: number | null) => {
    try {
      if (next === null) {
        window.localStorage.removeItem(storageKey);
      } else {
        window.localStorage.setItem(storageKey, String(next));
      }
    } catch {
      // Storage is blocked, so the change cannot be kept.
    }
    listeners.forEach((listener) => listener());
  }, []);

  return { width, saveWidth };
}
