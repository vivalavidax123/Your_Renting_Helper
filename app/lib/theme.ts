export type Theme = "light" | "dark";

export const themeStorageKey = "rent-helper-theme-v1";

export const themeBootstrapScript = `
(() => {
  let theme = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

  try {
    const storedTheme = window.localStorage.getItem("${themeStorageKey}");
    if (storedTheme === "light" || storedTheme === "dark") {
      theme = storedTheme;
    }
  } catch {}

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
`;
