"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { themeStorageKey, type Theme } from "@/app/lib/theme";

type ThemeContextValue = {
  theme: Theme | null;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function storedTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function documentTheme(): Theme {
  const current = document.documentElement.dataset.theme;
  return current === "light" || current === "dark" ? current : systemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function subscribeToTheme(onThemeChange: (theme: Theme) => void) {
  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemChange = () => {
    if (storedTheme() !== null) return;

    const nextTheme = systemTheme();
    applyTheme(nextTheme);
    onThemeChange(nextTheme);
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== themeStorageKey) return;

    const nextTheme =
      event.newValue === "light" || event.newValue === "dark"
        ? event.newValue
        : systemTheme();
    applyTheme(nextTheme);
    onThemeChange(nextTheme);
  };

  colorScheme.addEventListener("change", handleSystemChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    colorScheme.removeEventListener("change", handleSystemChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme | null>(
    typeof document === "undefined" ? null : documentTheme,
  );

  useEffect(() => subscribeToTheme(setTheme), []);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => {
      const nextTheme =
        (currentTheme ?? documentTheme()) === "dark" ? "light" : "dark";

      try {
        window.localStorage.setItem(themeStorageKey, nextTheme);
      } catch {}

      applyTheme(nextTheme);
      return nextTheme;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return value;
}
