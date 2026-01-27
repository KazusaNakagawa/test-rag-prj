import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "ui-theme-mode";

/**
 * Resolve the effective theme mode, honoring system preferences when requested.
 */
function resolveTheme(mode: ThemeMode) {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Sync theme preference with local storage and apply it to the document root.
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
