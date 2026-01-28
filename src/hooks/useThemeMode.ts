import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "ui-theme-mode";

/**
 * Determine the effective theme, using the system preference when `mode` is `"system"`.
 *
 * @param mode - The requested theme mode (`"light"`, `"dark"`, or `"system"`)
 * @returns The resolved theme (`"light"` or `"dark"`). If `mode` is `"system"` and the runtime has no `window` (e.g., SSR), returns `"light"`.
 */
function resolveTheme(mode: ThemeMode) {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Manage and persist the UI theme mode and apply the resolved theme to the document root.
 *
 * Reads a previously saved theme from localStorage on mount (silently ignoring access errors),
 * writes changes to localStorage, sets `document.documentElement.dataset.theme` to the resolved
 * value (`"light"` or `"dark"`), and, when mode is `"system"`, listens for system
 * color-scheme changes to re-apply the resolved theme.
 *
 * @returns An object containing `mode` (the current ThemeMode) and `setMode` (a setter to update it)
 */
export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setMode(stored);
      }
    } catch {
      // Ignore storage access errors (private mode, restricted environments).
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore storage access errors (private mode, restricted environments).
    }
    const applyTheme = () => {
      const resolved = resolveTheme(mode);
      document.documentElement.dataset.theme = resolved;
    };
    applyTheme();
    if (typeof window.matchMedia !== "function") {
      return undefined;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (mode === "system") {
        applyTheme();
      }
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [mode]);

  return { mode, setMode };
}