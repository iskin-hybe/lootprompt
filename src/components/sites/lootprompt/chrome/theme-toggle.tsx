"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { readStorage, writeStorage } from "./use-hydrated";

type Theme = "light" | "dark";

const THEME_KEY = "pda:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function storedTheme(): Theme | null {
  const value = readStorage("local", THEME_KEY);
  return value === "dark" || value === "light" ? value : null;
}

// The <head> script in the layout applies the stored theme before paint, so the
// `dark` class on <html> is the source of truth; watch it for changes.
function subscribeToThemeClass(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const currentTheme = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

/** Day/night paper theme, stored in localStorage["pda:theme"] (source `ih`). */
function useTheme() {
  const theme = useSyncExternalStore(subscribeToThemeClass, currentTheme, () => "light" as Theme);

  useEffect(() => {
    applyTheme(storedTheme() ?? (window.matchMedia(DARK_QUERY).matches ? "dark" : "light"));
    if (storedTheme()) return;
    // Without a stored choice, follow the OS setting live.
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => applyTheme(event.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    writeStorage("local", THEME_KEY, next);
  }, []);

  return { theme, toggle };
}

/** Sun that is bitten into a crescent moon (source `ah`). */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`theme-toggle${dark ? " is-dark" : ""}`}
      aria-pressed={dark}
      aria-label={dark ? "Switch to daylight paper" : "Switch to night paper"}
      title={dark ? "Daylight" : "Night paper"}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="theme-glyph size-[18px]">
        <mask id="theme-bite">
          <rect x="0" y="0" width="24" height="24" fill="#fff" />
          <circle className="theme-bite" cx="24" cy="4" r="8" fill="#000" />
        </mask>
        <circle
          className="theme-disc"
          cx="12"
          cy="12"
          r="4.6"
          stroke="currentColor"
          strokeWidth="1.4"
          mask="url(#theme-bite)"
        />
        <g className="theme-rays" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M12 3.1V4.9M12 19.2V21M3.2 12.1H5M19.1 11.9H20.9M5.7 5.9L7 7.2M17 17L18.4 18.3M18.3 5.8L17 7.1M7 16.9L5.7 18.3" />
        </g>
        <g className="theme-sparks" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <path d="M18.2 6.6l.5 1.6M20.6 10.6l1.3.5" />
        </g>
      </svg>
    </button>
  );
}
